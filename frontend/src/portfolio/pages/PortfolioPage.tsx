import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import portfolioService from '../services/portfolioService';

interface Profile {
  name: string;
  email: string;
  role: string;
  description: string;
  photo?: string;
}

interface Skill {
  id: number;
  name: string;
  category: string;
}

interface Project {
  id: number;
  title: string;
  description: string;
  image?: string;
  link: string;
  technologies?: string[];
}

const PortfolioPage = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileData, skillsData, projectsData] = await Promise.all([
        portfolioService.getProfile(),
        portfolioService.getSkills(),
        portfolioService.getProjects(),
      ]);
      setProfile(profileData);
      setSkills(skillsData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading portfolio data:', error);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus('loading');
    
    try {
      await portfolioService.sendMessage(contactForm);
      setSubmitStatus('success');
      setContactForm({ name: '', email: '', message: '' });
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } catch (error) {
      console.error('Error sending message:', error);
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 5000);
    }
  };

  const groupedSkills = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = [];
    }
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section id="home" className="min-h-screen flex items-center justify-center pt-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="mb-8"
          >
            <div className="w-48 h-48 mx-auto rounded-full glass overflow-hidden flex items-center justify-center">
              {profile?.photo ? (
                <img src={profile.photo} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <i className="bi bi-person-circle text-9xl text-white"></i>
              )}
            </div>
          </motion.div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
            {profile?.name || 'Salomé Rodríguez Moscoso'}
          </h1>
          <p className="text-2xl md:text-3xl text-purple-200 mb-8">
            {profile?.role || 'Desarrolladora en formación'}
          </p>
          <motion.a
            href="#about"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block px-8 py-4 glass text-white font-semibold rounded-full hover:bg-white hover:bg-opacity-20 transition-all"
          >
            Conoce más sobre mí
          </motion.a>
        </motion.div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass rounded-3xl p-8 md:p-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Sobre mí</h2>
            <p className="text-lg text-white leading-relaxed mb-6">
              {profile?.description || 'Desarrolladora en crecimiento con experiencia en proyectos académicos y personales utilizando React, Node.js, PostgreSQL y Supabase.'}
            </p>
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="glass rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <i className="bi bi-briefcase text-2xl"></i>
                  Experiencia
                </h3>
                <ul className="text-white space-y-2">
                  <li>• Monitora socioeducativa – ASES (2025)</li>
                  <li>• Desarrollo de sistemas académicos (2025)</li>
                  <li>• Sistema para tienda escolar Maida's (2025)</li>
                </ul>
              </div>
              <div className="glass rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <i className="bi bi-mortarboard text-2xl"></i>
                  Educación
                </h3>
                <p className="text-white">
                  Estudiante activa en desarrollo web y programación
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Skills Section */}
      <section id="skills" className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-white text-center mb-12"
          >
            Habilidades
          </motion.h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(groupedSkills).map(([category, categorySkills], index) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass rounded-xl p-6"
              >
                <h3 className="text-xl font-bold text-white mb-4">{category}</h3>
                <ul className="space-y-2">
                  {categorySkills.map((skill) => (
                    <motion.li
                      key={skill.id}
                      whileHover={{ x: 5 }}
                      className="text-purple-100 flex items-center gap-2"
                    >
                      <i className="bi bi-check-circle-fill text-purple-300"></i>
                      {skill.name}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-white text-center mb-12"
          >
            Proyectos
          </motion.h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -10 }}
                className="glass rounded-xl overflow-hidden"
              >
                {project.image ? (
                  <img src={project.image} alt={project.title} className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <i className="bi bi-code-square text-6xl text-white"></i>
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">{project.title}</h3>
                  <p className="text-purple-100 mb-4">{project.description}</p>
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.technologies.map((tech, i) => (
                        <span key={i} className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-xs text-white">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-white hover:text-purple-200 transition-colors"
                  >
                    Ver proyecto <i className="bi bi-arrow-right"></i>
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-6">
        <div className="container mx-auto max-w-2xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-white text-center mb-12"
          >
            Contacto
          </motion.h2>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-xl p-8"
          >
            <form onSubmit={handleContactSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-white mb-2">Nombre</label>
                <input
                  type="text"
                  id="name"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white bg-opacity-20 text-white placeholder-purple-200 border border-white border-opacity-30 focus:outline-none focus:border-purple-300"
                  placeholder="Tu nombre"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-white mb-2">Email</label>
                <input
                  type="email"
                  id="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white bg-opacity-20 text-white placeholder-purple-200 border border-white border-opacity-30 focus:outline-none focus:border-purple-300"
                  placeholder="tu@email.com"
                />
              </div>
              
              <div>
                <label htmlFor="message" className="block text-white mb-2">Mensaje</label>
                <textarea
                  id="message"
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  required
                  rows={5}
                  className="w-full px-4 py-3 rounded-lg bg-white bg-opacity-20 text-white placeholder-purple-200 border border-white border-opacity-30 focus:outline-none focus:border-purple-300 resize-none"
                  placeholder="Escribe tu mensaje aquí..."
                />
              </div>
              
              <motion.button
                type="submit"
                disabled={submitStatus === 'loading'}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-white bg-opacity-20 text-white font-semibold rounded-lg hover:bg-opacity-30 transition-all disabled:opacity-50"
              >
                {submitStatus === 'loading' ? 'Enviando...' : 'Enviar mensaje'}
              </motion.button>
              
              {submitStatus === 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-green-500 bg-opacity-20 border border-green-300 rounded-lg text-white text-center"
                >
                  ¡Mensaje enviado con éxito! Me pondré en contacto pronto.
                </motion.div>
              )}
              
              {submitStatus === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500 bg-opacity-20 border border-red-300 rounded-lg text-white text-center"
                >
                  Hubo un error al enviar el mensaje. Por favor, intenta de nuevo.
                </motion.div>
              )}
            </form>
            
            <div className="mt-8 pt-8 border-t border-white border-opacity-20 text-center">
              <p className="text-white mb-4">O contáctame directamente:</p>
              <a
                href={`mailto:${profile?.email || 'salomerodriguezmoscoso@gmail.com'}`}
                className="text-xl text-purple-200 hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <i className="bi bi-envelope"></i>
                {profile?.email || 'salomerodriguezmoscoso@gmail.com'}
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PortfolioPage;
