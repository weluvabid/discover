import App from '@/app/App';

interface DiscoverIslandProps {
  initialLocation: string;
}

export function DiscoverIsland({ initialLocation }: DiscoverIslandProps) {
  return <App initialLocation={initialLocation} />;
}
