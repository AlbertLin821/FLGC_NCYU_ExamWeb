import React from 'react';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="page">
      <Header />
      <main className="content">
        <div className="container">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
