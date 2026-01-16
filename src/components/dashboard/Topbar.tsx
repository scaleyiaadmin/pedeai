import { useState } from 'react';
import { Search, Settings, Wifi, WifiOff } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import SettingsModal from './SettingsModal';

const Topbar: React.FC = () => {
  const { filter, setFilter } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [whatsappConnected] = useState(true);

  const filters: { value: 'all' | 'bar' | 'kitchen'; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'bar', label: 'Bar' },
    { value: 'kitchen', label: 'Cozinha' },
  ];

  return (
    <>
      <header className="h-16 bg-card border-b border-border px-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center">
          <Logo size="sm" />
        </div>

        <div className="flex items-center gap-2">
          {filters.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-4 transition-all ${
                filter === f.value 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {whatsappConnected ? (
              <div className="flex items-center gap-1.5 text-primary text-sm font-medium">
                <Wifi className="w-4 h-4" />
                <span className="hidden sm:inline">WhatsApp Conectado</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-destructive text-sm font-medium">
                <WifiOff className="w-4 h-4" />
                <span className="hidden sm:inline">Desconectado</span>
              </div>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-48 h-9 rounded-full bg-secondary border-none"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            className="rounded-full hover:bg-secondary"
          >
            <Settings className="w-5 h-5 text-foreground" />
          </Button>
        </div>
      </header>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </>
  );
};

export default Topbar;
