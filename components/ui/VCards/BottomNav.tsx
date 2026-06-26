"use client";

interface NavItem {
  id: string;
  label: string;
  href?: string;
}

interface BottomNavProps {
  items: NavItem[];
  activeId: string;
  onNavigate: (id: string) => void;
}

export default function BottomNav({ items, activeId, onNavigate }: BottomNavProps) {
  return (
    <nav className="navbar">
      <ul className="navbar-list">
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <li key={item.id} className="navbar-item">
              {item.href ? (
                <a
                  href={item.href}
                  className={`navbar-link ${isActive ? "active" : ""}`}
                >
                  {item.label}
                </a>
              ) : (
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`navbar-link ${isActive ? "active" : ""}`}
                >
                  {item.label}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
