import type { ProductCardData } from '../lib/types';

interface Props {
  products: ProductCardData[];
  onClose: () => void;
}

function limitProducts(products: ProductCardData[], max = 3): ProductCardData[] {
  return products.slice(0, max);
}

function allFieldLabels(products: ProductCardData[]): string[] {
  const labels = new Set<string>();
  labels.add('Name');
  for (const p of products) {
    if (p.price !== undefined) labels.add('Price');
    if (p.description !== undefined) labels.add('Description');
  }
  return Array.from(labels);
}

function getFieldValue(product: ProductCardData, label: string): string {
  switch (label) {
    case 'Name': return product.name;
    case 'Price': return product.price || 'Contact for pricing';
    case 'Description': return product.description ?? '—';
    default: return '—';
  }
}

export function ComparisonView({ products, onClose }: Props) {
  const limited = limitProducts(products);
  const labels = allFieldLabels(limited);

  return (
    <div className="so-comparison" role="dialog" aria-modal="true" aria-label="Product comparison">
      <div className="so-comparison__header">
        <h3 className="so-comparison__title">Compare Products</h3>
        <button
          className="so-comparison__close"
          onClick={onClose}
          aria-label="Close comparison"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="so-comparison__scroll">
        <table className="so-comparison__table">
          <thead>
            <tr>
              <th className="so-comparison__th so-comparison__th--label" />
              {limited.map((p, i) => (
                <th key={i} className="so-comparison__th">
                  {p.imageUrl && (
                    <img
                      className="so-comparison__img"
                      src={p.imageUrl}
                      alt={`${p.name} product image`}
                    />
                  )}
                  <span className="so-comparison__col-name">{p.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((label) => (
              <tr key={label} className="so-comparison__row">
                <td className="so-comparison__label">{label}</td>
                {limited.map((p, i) => (
                  <td key={i} className="so-comparison__cell">
                    {label === 'Name' && p.buyUrl ? (
                      <a
                        href={p.buyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="so-comparison__link"
                      >
                        {getFieldValue(p, label)}
                      </a>
                    ) : (
                      getFieldValue(p, label)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
