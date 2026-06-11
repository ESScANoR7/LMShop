import React, { memo, useMemo } from 'react';
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { formatPrice } from '../utils/format';

/**
 * Оптимізований компонент для елемента кошика
 */
const CartItem = memo(({ item, onRemove, onQuantityChange }) => {
  const itemTotal = useMemo(
    () => parseFloat(item.price || 0),
    [item.price]
  );

  return (
    <div className="flex gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors">
      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white truncate">
          {item.product?.name || 'Unknown Product'}
        </h3>
        <p className="text-sm text-slate-400">
          Type: {item.type}
          {item.product?.level && ` • Level ${item.product.level}`}
        </p>
      </div>

      {/* Price and Actions */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="font-semibold text-blue-400">
            {formatPrice(itemTotal)}
          </p>
          {item.product?.base_price && (
            <p className="text-xs text-slate-400 line-through">
              {formatPrice(item.product.base_price)}
            </p>
          )}
        </div>

        <button
          onClick={() => onRemove(item.cartId)}
          className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
          aria-label="Remove from cart"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

CartItem.displayName = 'CartItem';

export default CartItem;
