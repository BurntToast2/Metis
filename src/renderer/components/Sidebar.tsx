import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Sidebar.css';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
  relatedIds?: string[]; 
}

const NAV_ITEMS: NavItem[] = [
  { id: 'library', label: 'Library' },
  {
    id: 'cmms',
    label: 'CMMs',
    children: [
      { id: 'cmm-add', label: 'Add New CMM' },
      { id: 'cmm-edit', label: 'Edit CMM' },
    ],
  },
  { id: 'search', label: 'Search', relatedIds: ['search-viewer'] },
  { id: 'settings', label: 'Settings' },
];

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const [openFlyout, setOpenFlyout] = useState<string | null>(null);
  const navRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!openFlyout) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenFlyout(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFlyout]);

  const handleItemClick = (item: NavItem) => {
    if (item.children) {
      setOpenFlyout((current) => (current === item.id ? null : item.id));
    } else {
      onNavigate(item.id);
      setOpenFlyout(null);
    }
  };

  const handleChildClick = (childId: string) => {
    onNavigate(childId);
    setOpenFlyout(null);
  };

  return (
    <nav className="sidebar">
      <div className="sidebar__brand">Metis</div>
      <ul className="sidebar__nav" ref={navRef}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            activePage === item.id ||
            item.children?.some((c) => c.id === activePage) ||
            item.relatedIds?.includes(activePage);
          const isFlyoutOpen = openFlyout === item.id;

          return (
            <li key={item.id} className="sidebar__nav-li">
              <motion.button
                className={`sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`}
                onClick={() => handleItemClick(item)}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                {item.label}
                {item.children && (
                  <motion.span
                    className="sidebar__nav-chevron"
                    animate={{ rotate: isFlyoutOpen ? 90 : 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    &rsaquo;
                  </motion.span>
                )}
              </motion.button>

              <AnimatePresence>
                {item.children && isFlyoutOpen && (
                  <motion.div
                    className="sidebar__flyout"
                    initial={{ opacity: 0, x: -10, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -10, scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  >
                    {item.children.map((child, i) => (
                      <motion.button
                        key={child.id}
                        className={`sidebar__flyout-item ${activePage === child.id ? 'sidebar__flyout-item--active' : ''}`}
                        onClick={() => handleChildClick(child.id)}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04, type: 'spring', stiffness: 500, damping: 28 }}
                        whileHover={{ x: 3 }}
                        whileTap={{ scale: 0.96 }}
                      >
                        {child.label}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}