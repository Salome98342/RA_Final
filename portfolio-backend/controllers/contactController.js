const supabase = require('../config/supabase');
const { validationResult } = require('express-validator');

// Create a new contact message
const createMessage = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, message } = req.body;

    let data = null;
    
    if (supabase) {
      const result = await supabase
        .from('messages')
        .insert([
          { 
            name, 
            email, 
            message,
            created_at: new Date().toISOString()
          }
        ])
        .select();
      
      if (result.error) throw result.error;
      data = result.data;
    } else {
      // Fallback: just log the message
      console.log('Contact message received:', { name, email, message });
      data = [{ name, email, message, created_at: new Date().toISOString() }];
    }

    res.status(201).json({ 
      success: true,
      message: '¡Mensaje enviado con éxito! Me pondré en contacto pronto.',
      data 
    });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Error al enviar el mensaje' });
  }
};

module.exports = {
  createMessage
};
