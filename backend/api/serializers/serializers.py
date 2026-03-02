from rest_framework import serializers
from ..models.models import (
    TipoDocumento, TipoActividad, Programa, Docente, Estudiante, Asignatura,
    ResultadoDeAprendizaje, Matricula, Recurso, PasswordResetOTP,
    LoginAttempt, AccountLockout, SecurityEvent
)


class TipoDocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoDocumento
        fields = "__all__"

class TipoActividadSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoActividad
        fields = "__all__"

class ProgramaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Programa
        fields = "__all__"

class DocenteSerializer(serializers.ModelSerializer):
    # Expandir tipo_documento como objeto anidado
    tipo_documento = TipoDocumentoSerializer(read_only=True)
    
    class Meta:
        model = Docente
        fields = "__all__"

class EstudianteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estudiante
        fields = "__all__"

class AsignaturaSerializer(serializers.ModelSerializer):
    # Expandir ForeignKeys como objetos anidados para el frontend
    docente = DocenteSerializer(read_only=True)
    programa = ProgramaSerializer(read_only=True)
    
    class Meta:
        model = Asignatura
        fields = "__all__"

class ResultadoDeAprendizajeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResultadoDeAprendizaje
        fields = "__all__"

class RecursoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recurso
        fields = "__all__"


# ==================== SERIALIZERS PARA RECUPERACIÓN DE CONTRASEÑA ====================

class PasswordForgotSerializer(serializers.Serializer):
    """Serializer para solicitar un código OTP de recuperación de contraseña"""
    email = serializers.EmailField(
        required=True,
        error_messages={
            'required': 'El correo electrónico es requerido',
            'invalid': 'Ingrese un correo electrónico válido'
        }
    )

    def validate_email(self, value):
        """Normalizar el email a minúsculas"""
        return value.lower().strip()


class VerifyOTPSerializer(serializers.Serializer):
    """Serializer para verificar un código OTP"""
    email = serializers.EmailField(
        required=True,
        error_messages={
            'required': 'El correo electrónico es requerido',
            'invalid': 'Ingrese un correo electrónico válido'
        }
    )
    otp_code = serializers.CharField(
        max_length=6,
        min_length=6,
        required=True,
        error_messages={
            'required': 'El código OTP es requerido',
            'max_length': 'El código OTP debe tener 6 dígitos',
            'min_length': 'El código OTP debe tener 6 dígitos'
        }
    )

    def validate_email(self, value):
        return value.lower().strip()

    def validate_otp_code(self, value):
        """Validar que el código sea numérico de 6 dígitos"""
        if not value.isdigit():
            raise serializers.ValidationError('El código OTP debe contener solo dígitos')
        return value


class PasswordResetSerializer(serializers.Serializer):
    """Serializer para restablecer la contraseña usando un código OTP verificado"""
    email = serializers.EmailField(
        required=True,
        error_messages={
            'required': 'El correo electrónico es requerido',
            'invalid': 'Ingrese un correo electrónico válido'
        }
    )
    otp_code = serializers.CharField(
        max_length=6,
        min_length=6,
        required=True,
        error_messages={
            'required': 'El código OTP es requerido',
            'max_length': 'El código OTP debe tener 6 dígitos',
            'min_length': 'El código OTP debe tener 6 dígitos'
        }
    )
    password = serializers.CharField(
        min_length=6,
        max_length=128,
        required=True,
        write_only=True,
        error_messages={
            'required': 'La contraseña es requerida',
            'min_length': 'La contraseña debe tener al menos 6 caracteres',
            'max_length': 'La contraseña no puede exceder 128 caracteres'
        }
    )

    def validate_email(self, value):
        return value.lower().strip()

    def validate_otp_code(self, value):
        if not value.isdigit():
            raise serializers.ValidationError('El código OTP debe contener solo dígitos')
        return value
