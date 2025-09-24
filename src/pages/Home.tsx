import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { demos as demoRegistry, type DemoMeta } from '@/lib/demo_registry';

const Home = () => {
    const [demos, setDemos] = useState<DemoMeta[]>([]);

    useEffect(() => {
        setDemos(demoRegistry);
    }, []);

    return (
        <div className="portfolio-container">
            <div className="portfolio-intro">
                <h1 className="portfolio-title">Procisics</h1>
                <p className="portfolio-subtitle">Interactive procedural physics experiments</p>
            </div>

            <div className="demos-grid">
                {demos.map((demo) => (
                    <div key={demo.slug} className="demo-card">
                        <Link to={`/${demo.slug}`} className="demo-card-link" aria-describedby={`${demo.slug}-desc`}>
                            <div className="demo-card-thumbnail">
                                <demo.Thumb />
                            </div>
                            <div className="demo-card-content">
                                <h2 className="demo-card-title">{demo.title}</h2>
                                <p id={`${demo.slug}-desc`} className="demo-card-description">
                                    {demo.description}
                                </p>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Home;