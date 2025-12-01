const supabase = require('../config/supabase');

// Get profile information
const getProfile = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profile')
      .select('*')
      .single();

    if (error) throw error;

    res.json(data || {
      name: 'Salomé Rodríguez Moscoso',
      email: 'salomerodriguezmoscoso@gmail.com',
      role: 'Estudiante y desarrolladora en formación',
      description: 'Desarrolladora en crecimiento con experiencia en proyectos académicos y personales utilizando React, Node.js, PostgreSQL y Supabase. Interesada en diseño web, interfaces usables y accesibles, dashboards y sistemas de gestión.',
      photo: null
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Error al obtener el perfil' });
  }
};

module.exports = {
  getProfile
};
