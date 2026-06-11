import React, { memo, useMemo } from 'react';
import { formatPrice, formatNumber } from '../utils/format';

/**
 * Оптимізований компонент для картки товару
 */
const ProductCard = memo(({ product, onAddToCart, type = 'account' }) => {
  const discount = useMemo(() => {
    if (!product.base_price || !product.price) return 0;
    const diff = product.base_price - product.price;
    return Math.round((diff / product.base_price) * 100);
  }, [product.base_price, product.price]);

  return (
    <div className="group relative bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
      {/* Discount Badge */}
      {discount > 0 && (
        <div className="absolute top-3 right-3 z-10 bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-bold">
          -{discount}%
        </div>
      )}

      {/* Content */}
      <div className="p-4 h-full flex flex-col">
        <h3 className="font-semibold text-white mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
          {product.name}
        </h3>

        {/* Stats */}
        <div className="text-sm text-slate-400 mb-3 space-y-1">
          {product.level && (
            <p>📊 Level: <span className="text-slate-300">{product.level}</span></p>
          )}
          {product.might && (
            <p>⚔️ Might: <span className="text-slate-300">{formatNumber(product.might)}</span></p>
          )}
          {product.resources && (
            <p>📦 Amount: <span className="text-slate-300">{formatNumber(product.resources)}</span></p>
          )}
        </div>

        {/* Price */}
        <div className="mt-auto mb-4 pt-3 border-t border-slate-700/50">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-emerald-400">
              {formatPrice(product.price)}
            </span>
            {product.base_price && (
              <span className="text-sm text-slate-400 line-through">
                {formatPrice(product.base_price)}
              </span>
            )}
          </div>
        </div>

        {/* Add Button */}
        <button
          onClick={() => onAddToCart(product, type)}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
          aria-label={`Add ${product.name} to cart`}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
