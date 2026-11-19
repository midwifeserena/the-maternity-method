import Link from 'next/link';
import {Heart} from 'lucide-react';
import styles from './site-brand.module.css';

export function SiteBrand({href = '/', label = 'The Maternity Method home'}: {href?: string; label?: string}) {
  return (
    <Link href={href} className={styles.brand} aria-label={label}>
      <span className={styles.mark}><Heart size={19} fill="currentColor" aria-hidden="true" /></span>
      <span>
        <span className={styles.title}>The Maternity Method</span>
        <span className={styles.tagline}>Making maternity make sense</span>
      </span>
    </Link>
  );
}
