import prisma from '../prismaClient.js';

/* =========================================================================
 * Helpers
 * ========================================================================= */
const parseDecimal = (v) => {
  if (typeof v === 'number') return v;
  if (v == null || v === '') return null;
  // aceita "1.234,56" ou "1234.56"
  const s = String(v).trim().replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const parseInteger = (v) => {
  if (typeof v === 'number') return Math.trunc(v);
  if (v == null || v === '') return null;
  const n = parseInt(String(v).trim(), 10);
  return Number.isFinite(n) ? n : null;
};

/** Filtros básicos p/ listagens */
const buildWhere = (companyId, q, categoryId, brandId) => {
  const where = { companyId };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (brandId) where.brandId = brandId;
  return where;
};

/** Converte uma lista para CSV (separador ';' estilo BR) */
const toCSV = (rows = []) => {
  const cols = [
    'id',
    'name',
    'price',
    'stock',
    'cost',
    'category',
    'brand',
    'description',
  ];
  const header = cols.join(';');
  const escape = (x) => {
    const s = (x ?? '').toString().replace(/"/g, '""');
    return /[;\n"]/.test(s) ? `"${s}"` : s;
  };
  const lines = rows.map((p) => {
    const line = [
      p.id ?? '',
      p.name ?? '',
      p.price ?? '',
      p.stock ?? 0,
      p.cost ?? '',
      p.category?.name ?? p.categoryName ?? '',
      p.brand?.name ?? p.brandName ?? '',
      p.description ?? '',
    ].map(escape);
    return line.join(';');
  });
  return [header, ...lines].join('\n');
};

/** CSV parser simples (colunas: name,price,stock,cost,category,brand,description) */
const parseCsvSimple = (buf) => {
  const txt = Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf || '');
  const lines = txt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].split(/;|,/).map((h) => h.trim().toLowerCase());
  const idx = (name) => header.indexOf(name);

  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    // divisão simples por ; ou , (não cobre aspas com separador interno):
    const parts = raw.split(/;|,/);
    const row = {
      name: parts[idx('name')]?.trim(),
      price: parts[idx('price')]?.trim(),
      stock: parts[idx('stock')]?.trim(),
      cost: parts[idx('cost')]?.trim(),
      category: parts[idx('category')]?.trim(),
      brand: parts[idx('brand')]?.trim(),
      description: parts[idx('description')]?.trim(),
      // suporte opcional a ids:
      categoryId: parts[idx('categoryid')]?.trim(),
      brandId: parts[idx('brandid')]?.trim(),
    };
    if (row.name) out.push(row);
  }
  return out;
};

/** Garante categoria por nome (cria se não existir) */
const ensureCategory = async (companyId, name) => {
  if (!name) return null;
  const found = await prisma.category.findFirst({
    where: { companyId, name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  });
  if (found) return found.id;
  const created = await prisma.category.create({
    data: { companyId, name },
    select: { id: true },
  });
  return created.id;
};

/** Garante marca por nome (cria se não existir) */
const ensureBrand = async (companyId, name) => {
  if (!name) return null;
  const found = await prisma.brand.findFirst({
    where: { companyId, name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  });
  if (found) return found.id;
  const created = await prisma.brand.create({
    data: { companyId, name },
    select: { id: true },
  });
  return created.id;
};

/* =========================================================================
 * Controllers
 * ========================================================================= */

// GET /api/products
export const listProducts = async (req, res) => {
  try {
    const { q = '', page, take, categoryId, brandId, sort = 'name', order = 'asc' } = req.query;

    // paginação opcional (compatível: retornamos array)
    const _take = Math.min(Math.max(parseInt(take || 0, 10) || 0, 0), 500);
    const _page = Math.max(parseInt(page || 1, 10) || 1, 1);
    const _skip = _take > 0 ? (_page - 1) * _take : undefined;

    const where = buildWhere(req.company.id, q || '', categoryId || undefined, brandId || undefined);

    const orderBy = {};
    const validSort = ['name', 'price', 'stock', 'createdAt', 'updatedAt'];
    const validOrder = ['asc', 'desc'];
    orderBy[validSort.includes(sort) ? sort : 'name'] =
      validOrder.includes(order) ? order : 'asc';

    const products = await prisma.product.findMany({
      where,
      include: { category: true, brand: true },
      orderBy,
      ...( _take > 0 ? { take: _take, skip: _skip } : {} ),
    });

    // compat: devolve array
    res.status(200).json(products);
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// POST /api/products
export const createProduct = async (req, res) => {
  try {
    const { name, price, stock, cost, description, categoryId, brandId } = req.body;

    const data = {
      companyId: req.company.id,
      name: String(name || '').trim(),
      price: parseDecimal(price) ?? 0,
      stock: parseInteger(stock) ?? 0,
      cost: parseDecimal(cost),
      description: description || '',
      categoryId: categoryId || null,
      brandId: brandId || null,
    };

    // Se categoryId/brandId vierem vazios mas houver 'category'/'brand' (caso CSV no front), ignore aqui.
    const created = await prisma.product.create({ data });
    res.status(201).json(created);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ message: 'Erro ao criar produto.' });
  }
};

// PUT /api/products/:id
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // garante ownership
    const exists = await prisma.product.findFirst({
      where: { id, companyId: req.company.id },
      select: { id: true },
    });
    if (!exists) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }

    const { name, price, stock, cost, description, categoryId, brandId } = req.body;
    const data = {
      ...(name != null ? { name: String(name).trim() } : {}),
      ...(price != null ? { price: parseDecimal(price) ?? 0 } : {}),
      ...(stock != null ? { stock: parseInteger(stock) ?? 0 } : {}),
      ...(cost !== undefined ? { cost: parseDecimal(cost) } : {}),
      ...(description != null ? { description } : {}),
      categoryId: categoryId ?? null,
      brandId: brandId ?? null,
    };

    const updated = await prisma.product.update({
      where: { id },
      data,
      include: { category: true, brand: true },
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ message: 'Erro ao atualizar produto.' });
  }
};

// DELETE /api/products/:id
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const exists = await prisma.product.findFirst({
      where: { id, companyId: req.company.id },
      select: { id: true },
    });
    if (!exists) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }

    await prisma.product.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    if (error?.code === 'P2003') {
      return res.status(409).json({
        message:
          'Este produto não pode ser excluído, pois está associado a uma ou mais comandas.',
      });
    }
    res.status(500).json({ message: 'Erro ao deletar produto.' });
  }
};

/* =========================================================================
 * Novas actions (casam com as rotas extras)
 * ========================================================================= */

// PATCH /api/products/:id  (parcial)
export const patchProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const exists = await prisma.product.findFirst({
      where: { id, companyId: req.company.id },
      select: { id: true },
    });
    if (!exists) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }

    const allow = ['name', 'price', 'stock', 'cost', 'description', 'categoryId', 'brandId'];
    const data = {};

    for (const k of allow) {
      if (req.body[k] === undefined) continue;
      if (k === 'price') data.price = parseDecimal(req.body.price) ?? 0;
      else if (k === 'stock') data.stock = parseInteger(req.body.stock) ?? 0;
      else if (k === 'cost') data.cost = parseDecimal(req.body.cost);
      else if (k === 'name') data.name = String(req.body.name).trim();
      else data[k] = req.body[k] ?? null;
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
      include: { category: true, brand: true },
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error('Erro no PATCH de produto:', error);
    res.status(500).json({ message: 'Erro ao atualizar produto.' });
  }
};

// POST /api/products/bulk-delete  { ids: [...] }
export const bulkDeleteProducts = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];
    if (ids.length === 0) {
      return res.status(400).json({ message: 'Informe os IDs para exclusão.' });
    }

    const result = { deleted: [], failed: [] };

    for (const id of ids) {
      try {
        const exists = await prisma.product.findFirst({
          where: { id, companyId: req.company.id },
          select: { id: true },
        });
        if (!exists) {
          result.failed.push({ id, reason: 'not_found' });
          continue;
        }
        await prisma.product.delete({ where: { id } });
        result.deleted.push(id);
      } catch (e) {
        const reason = e?.code === 'P2003' ? 'fk_conflict' : 'error';
        result.failed.push({ id, reason });
      }
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Erro na exclusão em massa de produtos:', error);
    res.status(500).json({ message: 'Erro ao excluir produtos em massa.' });
  }
};

// GET /api/products/export.csv  (mesmos filtros de list)
export const exportProductsCsv = async (req, res) => {
  try {
    const { q = '', categoryId, brandId, sort = 'name', order = 'asc' } = req.query;
    const where = buildWhere(req.company.id, q || '', categoryId || undefined, brandId || undefined);

    const orderBy = {};
    const validSort = ['name', 'price', 'stock', 'createdAt', 'updatedAt'];
    const validOrder = ['asc', 'desc'];
    orderBy[validSort.includes(sort) ? sort : 'name'] =
      validOrder.includes(order) ? order : 'asc';

    const rows = await prisma.product.findMany({
      where,
      include: { category: true, brand: true },
      orderBy,
    });

    const csv = toCSV(rows);
    const ts = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="produtos_${ts}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error('Erro ao exportar CSV de produtos:', error);
    res.status(500).json({ message: 'Erro ao exportar CSV.' });
  }
};

// POST /api/products/import.csv  (multipart/form-data; file)
export const importProductsCsv = async (req, res) => {
  try {
    const file = req.file;
    if (!file?.buffer?.length) {
      return res.status(400).json({ message: 'Arquivo CSV não enviado.' });
    }

    const rows = parseCsvSimple(file.buffer);
    if (rows.length === 0) {
      return res.status(400).json({ message: 'CSV vazio ou cabeçalho ausente.' });
    }

    const companyId = req.company.id;
    const created = [];
    const updated = [];
    const skipped = [];

    for (const r of rows) {
      try {
        const payload = {
          name: String(r.name || '').trim(),
          price: parseDecimal(r.price) ?? 0,
          stock: parseInteger(r.stock) ?? 0,
          cost: r.cost != null && r.cost !== '' ? parseDecimal(r.cost) : null,
          description: r.description || '',
          companyId,
          categoryId: r.categoryId || null,
          brandId: r.brandId || null,
        };

        // se não vier id de categoria/marca mas vier nome, cria/associa
        if (!payload.categoryId && r.category) {
          payload.categoryId = await ensureCategory(companyId, r.category);
        }
        if (!payload.brandId && r.brand) {
          payload.brandId = await ensureBrand(companyId, r.brand);
        }

        // estratégia: se já existe por (companyId, name) atualiza; senão cria
        const existing = await prisma.product.findFirst({
          where: { companyId, name: { equals: payload.name, mode: 'insensitive' } },
          select: { id: true },
        });

        if (existing) {
          await prisma.product.update({ where: { id: existing.id }, data: payload });
          updated.push(existing.id);
        } else {
          const c = await prisma.product.create({ data: payload });
          created.push(c.id);
        }
      } catch (e) {
        skipped.push({ name: r.name, reason: e?.message || 'erro' });
      }
    }

    res.status(200).json({ created, updated, skipped });
  } catch (error) {
    console.error('Erro ao importar CSV de produtos:', error);
    res.status(500).json({ message: 'Erro ao importar CSV.' });
  }
};
