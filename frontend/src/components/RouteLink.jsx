import { navigate } from '../utils/router';

/**
 * Native-History link.
 *
 * Renders a real <a href> (so the browser's link affordances, middle-click and
 * "copy link address" still work) but intercepts plain left-clicks to navigate
 * with history.pushState - no full page reload.
 */
export default function RouteLink({
  to,
  replace = false,
  children,
  className = '',
  onClick,
  ...rest
}) {
  const handleClick = (event) => {
    if (typeof onClick === 'function') {
      onClick(event);
    }
    if (event.defaultPrevented) {
      return;
    }
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return; /* let the browser handle new-tab / new-window intents */
    }
    event.preventDefault();
    navigate(to, { replace });
  };

  return (
    <a href={to} className={className} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}