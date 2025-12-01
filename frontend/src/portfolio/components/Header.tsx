import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass"
    >
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/portfolio" className="text-2xl font-bold text-white hover:text-purple-200 transition-colors">
            SR
          </Link>
          
          <ul className="flex gap-8">
            <li>
              <a href="#home" className="text-white hover:text-purple-200 transition-colors">
                Inicio
              </a>
            </li>
            <li>
              <a href="#about" className="text-white hover:text-purple-200 transition-colors">
                Sobre mí
              </a>
            </li>
            <li>
              <a href="#skills" className="text-white hover:text-purple-200 transition-colors">
                Habilidades
              </a>
            </li>
            <li>
              <a href="#projects" className="text-white hover:text-purple-200 transition-colors">
                Proyectos
              </a>
            </li>
            <li>
              <a href="#contact" className="text-white hover:text-purple-200 transition-colors">
                Contacto
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </motion.header>
  );
};

export default Header;
