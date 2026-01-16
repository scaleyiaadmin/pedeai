import pedeaiLogo from '@/assets/pedeai-logo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-24',
  };

  return (
    <div className="flex items-center gap-2">
      <img 
        src={pedeaiLogo} 
        alt="PedeAI Logo" 
        className={`${sizeClasses[size]} object-contain`}
      />
    </div>
  );
};

export default Logo;
