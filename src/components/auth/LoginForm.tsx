import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/Logo';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type AuthMode = 'login' | 'signup';

const LoginForm: React.FC = () => {
  const { login, signup, loadingData } = useApp();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; restaurantName?: string }>({});

  const clearErrors = () => setErrors({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    setIsLoading(true);
    
    if (mode === 'login') {
      const result = await login(email, password);
      
      if (!result.success) {
        toast.error(result.error || 'Erro ao realizar login');
      }
    } else {
      const result = await signup(restaurantName, email, password);
      
      if (!result.success) {
        toast.error(result.error || 'Erro ao criar conta');
      } else {
        toast.success('Conta criada! Verifique seu email para confirmar o cadastro.');
        setMode('login');
      }
    }
    
    setIsLoading(false);
  };

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-xl p-8 animate-fade-in">
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>
          
          <h1 className="text-2xl font-bold text-center text-foreground mb-2">
            {mode === 'login' ? 'Entrar no PedeAI' : 'Criar Conta'}
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            {mode === 'login' 
              ? 'Acesse o painel do seu restaurante' 
              : 'Cadastre seu restaurante no PedeAI'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="restaurantName" className="text-foreground font-medium">
                  Nome do Restaurante
                </Label>
                <Input
                  id="restaurantName"
                  type="text"
                  placeholder="Meu Restaurante"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className="h-12 rounded-xl border-border bg-secondary/50 focus:ring-primary"
                  disabled={isLoading}
                  maxLength={100}
                />
                {errors.restaurantName && (
                  <p className="text-sm text-destructive">{errors.restaurantName}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl border-border bg-secondary/50 focus:ring-primary"
                disabled={isLoading}
                maxLength={255}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl border-border bg-secondary/50 focus:ring-primary"
                disabled={isLoading}
                maxLength={128}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
              {mode === 'signup' && (
                <p className="text-xs text-muted-foreground">Mínimo 8 caracteres</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === 'login' ? 'Entrando...' : 'Criando conta...'}
                </>
              ) : (
                mode === 'login' ? 'Entrar' : 'Criar Conta'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              {mode === 'login' ? (
                <>
                  Não tem uma conta?{' '}
                  <button 
                    onClick={() => { setMode('signup'); clearErrors(); }}
                    className="text-primary font-semibold hover:underline"
                    type="button"
                  >
                    Cadastre-se
                  </button>
                </>
              ) : (
                <>
                  Já tem uma conta?{' '}
                  <button 
                    onClick={() => { setMode('login'); clearErrors(); }}
                    className="text-primary font-semibold hover:underline"
                    type="button"
                  >
                    Entrar
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
