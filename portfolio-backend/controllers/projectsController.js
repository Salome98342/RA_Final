const supabase = require('../config/supabase');

// Get all projects
const getProjects = async (req, res) => {
  try {
    let data = null;
    
    if (supabase) {
      const result = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (result.error) throw result.error;
      data = result.data;
    }

    res.json(data || [
      {
        id: 1,
        title: 'Sistema académico con RA Manager',
        description: 'Sistema integral de gestión de Resultados de Aprendizaje (RAs) para instituciones educativas con React, Node.js y PostgreSQL.',
        image: null,
        link: '#',
        technologies: ['React', 'Node.js', 'PostgreSQL', 'Django']
      },
      {
        id: 2,
        title: 'Dashboard con React',
        description: 'Dashboard interactivo con gráficas en tiempo real, análisis de datos y visualizaciones modernas.',
        image: null,
        link: '#',
        technologies: ['React', 'Chart.js', 'Bootstrap']
      },
      {
        id: 3,
        title: "App de tienda escolar (Maida's)",
        description: 'Sistema de gestión para tienda escolar con módulos de ventas, créditos, productos y clientes.',
        image: null,
        link: '#',
        technologies: ['React', 'Node.js', 'PostgreSQL']
      }
    ]);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Error al obtener proyectos' });
  }
};

module.exports = {
  getProjects
};
