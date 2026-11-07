import RouteLink from './RouteLink';

/**
 * Accessible breadcrumb trail (Part 2 UI requirement).
 *
 * items: [{ label: 'Projects', to: '/projects' }, { label: 'Dataset' }, { label: 'Upload Dataset' }]
 * The last item is the current page (no link, aria-current="page").
 */

export default function Breadcrumb({ items }) {
  const list = Array.isArray(items) ? items.filter((item) => item && item.label) : [];

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        {list.map((item, index) => {
          const isLast = index === list.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {item.to && !isLast ? (
                <RouteLink to={item.to} className="sv-link">
                  {item.label}
                </RouteLink>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={isLast ? 'font-semibold text-slate-900' : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <span aria-hidden="true" className="text-slate-400">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
