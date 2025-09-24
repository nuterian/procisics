import BouncingShapesThumb from '@/components/thumbs/BouncingShapesThumb';

export type DemoMeta = {
    slug: string;
    title: string;
    description: string;
    Thumb: React.FC;
};

export const demos: DemoMeta[] = [
    {
        slug: 'bouncing-shapes',
        title: 'Bouncing Shapes',
        description: 'Classic physics demonstration with colliding geometric primitives.',
        Thumb: BouncingShapesThumb,
    },
];