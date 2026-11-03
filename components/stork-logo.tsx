import type {ImgHTMLAttributes} from 'react';

const LOGO_URL =
  'https://pxwiguiprgwohcngglam.supabase.co/storage/v1/object/public/brand-assests/STORK%20PNG%20LOGO.png';

export function StorkLogo({
  style,
  alt = 'The Maternity Method logo',
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      {...props}
      src={LOGO_URL}
      width={props.width ?? 1536}
      height={props.height ?? 1024}
      alt={alt}
      style={{objectFit: 'contain', ...style}}
    />
  );
}
