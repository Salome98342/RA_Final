const supabase = require('../config/supabase');

// Get all skills
const getSkills = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .order('category', { ascending: true });

    if (error) throw error;

    res.json(data || [
      { id: 1, name: 'React', category: 'Frontend' },
      { id: 2, name: 'Bootstrap', category: 'Frontend' },
      { id: 3, name: 'Tailwind', category: 'Frontend' },
      { id: 4, name: 'Consumo de APIs', category: 'Frontend' },
      { id: 5, name: 'Componentización', category: 'Frontend' },
      { id: 6, name: 'Animaciones (Framer Motion)', category: 'Frontend' },
      { id: 7, name: 'Node.js', category: 'Backend' },
      { id: 8, name: 'Express', category: 'Backend' },
      { id: 9, name: 'JWT', category: 'Backend' },
      { id: 10, name: 'Django', category: 'Backend' },
      { id: 11, name: 'PostgreSQL', category: 'Base de datos' },
      { id: 12, name: 'Supabase', category: 'Base de datos' },
      { id: 13, name: 'Git y GitHub', category: 'Otras' },
    ]);
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Error al obtener habilidades' });
  }
};

module.exports = {
  getSkills
};
