import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import booksAnimation from '../../assets/Books-retro.lottie'; 
import './BooksLoader.css';

interface BooksLoaderProps {
  label?: string;
}

export function BooksLoader({ label = 'Loading…' }: BooksLoaderProps) {
  return (
    <div className="books-loader">
      <DotLottieReact
        src={booksAnimation}
        loop
        autoplay
        style={{ width: 350, height: 350 }}
      />
      {label && <span className="books-loader__label">{label}</span>}
    </div>
  );
}