import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const ProductForm = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    price: initialData?.price || '',
    cost: initialData?.cost || '',
    stock: initialData?.stock || 0,
    categoryId: initialData?.categoryId || '',
    brandId: initialData?.brandId || '',
  });

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        setLoading(true);
        const [catRes, brandRes] = await Promise.all([
          api.get('/categories'),
          api.get('/brands')
        ]);
        setCategories(catRes.data);
        setBrands(brandRes.data);
      } catch (error) {
        console.error("Erro ao carregar categorias e marcas", error);
        alert("Não foi possível carregar dados de suporte para o formulário.");
      } finally {
        setLoading(false);
      }
    };
    fetchDropdownData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (loading) return <p>A carregar formulário...</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">{initialData ? 'Editar Produto' : 'Novo Produto'}</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Nome do Produto</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" required />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Categoria (Opcional)</label>
          <select name="categoryId" value={formData.categoryId} onChange={handleChange} className="mt-1 block w-full p-2 border rounded">
            <option value="">Nenhuma</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Marca (Opcional)</label>
          <select name="brandId" value={formData.brandId} onChange={handleChange} className="mt-1 block w-full p-2 border rounded">
            <option value="">Nenhuma</option>
            {brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Preço de Venda (R$)</label>
          <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" required />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Quantidade em Stock</label>
          <input type="number" name="stock" value={formData.stock} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" required />
        </div>
      </div>

      <div>
          <label className="block text-sm font-medium text-gray-700">Preço de Custo (R$) (Opcional)</label>
          <input type="number" step="0.01" name="cost" value={formData.cost} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Descrição (Opcional)</label>
        <textarea name="description" value={formData.description} onChange={handleChange} rows="3" className="mt-1 block w-full p-2 border rounded"></textarea>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
        <button type="submit" className="px-4 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800">Salvar Produto</button>
      </div>
    </form>
  );
};

export default ProductForm;
