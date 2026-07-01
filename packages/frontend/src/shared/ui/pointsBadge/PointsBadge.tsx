import styles from './PointsBadge.module.scss';

interface PointsBadgeProps {
  value: number;
  variant?: 'dkp' | 'rating' | 'score' | 'gold';
  className?: string;
}

export const PointsBadge = ({ 
  value, 
  variant = 'dkp', 
  className = '' 
}: PointsBadgeProps) => {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${className}`}>
      {value} {variant == "dkp" ? variant.toUpperCase() : ""}
    </span>
  );
};