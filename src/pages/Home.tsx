import { useEffect, useState } from 'react';
import type React from 'react';

interface Demo {
  slug: string;
  title: string;
  description: string;
}

const getDemoThumbnail = (slug: string, index: number): React.ReactNode => {
  const colors = ['#ff6b6b'];
  const color = colors[index % colors.length];
  
  const thumbnails: Record<string, React.ReactNode> = {
    'bouncing-shapes': (
      <svg width="80" height="60" viewBox="0 0 80 60" fill="none">
        <circle cx="20" cy="20" r="8" fill={color} />
        <rect x="35" y="12" width="16" height="16" fill={color} />
        <polygon points="65,35 70,45 60,45" fill={color} />
      </svg>
    ),
  };
  
  return thumbnails[slug] || thumbnails['bouncing-shapes'];
};

const Home = () => {
  const [demos, setDemos] = useState<Demo[]>([]);

  useEffect(() => {
    // Portfolio data - in real implementation this would come from src/portfolio.ts
    const portfolioDemos: Demo[] = [
      {
        slug: 'bouncing-shapes',
        title: 'Bouncing Shapes',
        description: 'Classic physics demonstration with colliding geometric primitives.'
      },
    ];
    setDemos(portfolioDemos);
  }, []);

  // Base URL handling for deployment
  const base = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

  return (
    <div className="portfolio-container">
      <div className="portfolio-intro">
        <h1 className="portfolio-title">Procisics</h1>
        <p className="portfolio-subtitle">
          Interactive physics simulations and computational experiments
        </p>
      </div>
      
      <div className="demos-grid">
        {demos.map((demo, index) => (
          <div key={demo.slug} className="demo-card">
            <a 
              href={`${base}/${demo.slug}/`}
              className="demo-card-link"
              aria-describedby={`${demo.slug}-desc`}
            >
              <div className="demo-card-thumbnail">
                {getDemoThumbnail(demo.slug, index)}
              </div>
              <div className="demo-card-content">
                <h2 className="demo-card-title">{demo.title}</h2>
                <p id={`${demo.slug}-desc`} className="demo-card-description">
                  {demo.description}
                </p>
              </div>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;