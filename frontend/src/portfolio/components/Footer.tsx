import { motion } from 'framer-motion';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="glass mt-20"
    >
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-white text-center md:text-left">
            <p className="font-bold text-lg">Salomé Rodríguez Moscoso</p>
            <p className="text-sm text-purple-200">Desarrolladora en formación</p>
          </div>
          
          <div className="flex gap-6">
            <a
              href="https://github.com/Salome98342"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-purple-200 transition-colors"
              aria-label="GitHub"
            >
              <i className="bi bi-github text-2xl"></i>
            </a>
            <a
              href="mailto:salomerodriguezmoscoso@gmail.com"
              className="text-white hover:text-purple-200 transition-colors"
              aria-label="Email"
            >
              <i className="bi bi-envelope text-2xl"></i>
            </a>
            <a
              href="https://www.linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-purple-200 transition-colors"
              aria-label="LinkedIn"
            >
              <i className="bi bi-linkedin text-2xl"></i>
            </a>
          </div>
        </div>
        
        <div className="border-t border-white border-opacity-20 mt-6 pt-6 text-center">
          <p className="text-white text-sm">
            &copy; {currentYear} Salomé Rodríguez Moscoso. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer;
