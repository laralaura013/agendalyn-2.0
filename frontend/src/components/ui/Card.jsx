import React from 'react'
import { motion } from 'framer-motion'

const Card = ({ title, children }) => (
  <motion.div
    className="bg-white rounded-2xl shadow-md p-6 space-y-4"
    whileHover={{ y: -4, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
    transition={{ duration: 0.2 }}
  >
    {title && <h3 className="text-lg font-semibold">{title}</h3>}
    {children}
  </motion.div>
)

export default Card
