import type { ProductCardData } from '../lib/types';

interface Props {
  product: ProductCardData;
  onClose: () => void;
}

function formatPrice(price?: string): string {
  return price || 'Contact for pricing';
}

export function ProductCard({ product, onClose }: Props) {
  return (
    <div className="so-product-card" role="dialog" aria-modal="true" aria-label={product.name}>
      <button
        className="so-product-card__close"
        onClick={onClose}
        aria-label="Close product card"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {product.imageUrl && (
        <img
          className="so-product-card__image"
          src={product.imageUrl}
          alt={`${product.name} product image`}
        />
      )}

      <div className="so-product-card__body">
        <h3 className="so-product-card__name">{product.name}</h3>
        <p className="so-product-card__price">{formatPrice(product.price)}</p>

        {product.description && (
          <p className="so-product-card__desc">{product.description}</p>
        )}

        {product.buyUrl && (
          <a
            className="so-product-card__btn"
            href={product.buyUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View product
          </a>
        )}
      </div>
    </div>
  );
}
