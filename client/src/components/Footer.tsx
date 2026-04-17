import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h4>關於平台</h4>
            <p className="text-sm">國立中興大學線上英文前後測驗系統，提供學生專業、公平且便捷的考試環境。</p>
          </div>
          <div>
            <h4>相關連結</h4>
            <ul className="text-sm" style={{ listStyle: 'none' }}>
              <li><a href="https://lc.nchu.edu.tw/" target="_blank" rel="noreferrer">中興大學語言中心</a></li>
              <li><a href="https://www.nchu.edu.tw/" target="_blank" rel="noreferrer">國立中興大學</a></li>
            </ul>
          </div>
          <div>
            <h4>聯絡我們</h4>
            <p className="text-sm">地址：402 台中市南區興大路145號</p>
            <p className="text-sm">電話：04-22840326</p>
          </div>
        </div>
        <div className="footer-copyright">
          Copyright © 2026 National Chung Hsing University. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
