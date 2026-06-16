Logo:Paleta de colores: LA MISMA QUE LA WEB:https://depilacionparahombres.com/Aplicación web interna para gestión de turnos, clientes, recordatorios y estadísticas
Objetivo principal
La aplicación será principalmente de uso interno para Gonzalo y Luciano.
La parte de web pública, se utilizará únicamente para reserva online para clientes.
La app debe reemplazar el sistema actual de fichas en papel, agenda de turnos, etiquetas de WhatsApp y recordatorios manuales.
Actualmente, al agendar un turno se realiza este proceso:
Se habla con el cliente por WhatsApp.
Se coordina día y horario.
El cliente paga una seña.
En una ficha de papel se anota:
Nombre del cliente.
Zonas que se va a depilar.
Día y horario del turno.
Valor total.
Valor de la seña.
Cada nuevo turno se agrega debajo del anterior en su ficha, como una lista histórica, si es nuevo cliente, se crea una nueva ficha.
Si el cliente cancela, reprograma o no viene, se anota en esa misma lista.
En la parte de atrás de la ficha se agregan datos extra:
Dónde trabaja.
Comentarios personales.
Datos útiles para recordar.
Observaciones importantes para Gonzalo.
También se carga nombre completo, mail y teléfono para enviar confirmación del turno.
Por WhatsApp se etiqueta al cliente según la semana de su turno.
El sábado anterior a esa semana se envía un recordatorio masivo a todos los clientes de esa semana.
La app debe digitalizar todo ese proceso.

Estructura principal de la aplicación
Al abrir la web deben verse 4 modulos principales:
APLICACIÓN WEB INTERNA
│
├── 1. Agenda
├── 2. Clientes
├── 3. Estadísticas
└── 4. Notificaciones 
Estos 4 modulos deberán de poder accederse siempre desde una barra lateral o superior.AREA EXTERNA   Reserva online con carga de datos y pago de señaDebajo el el footer de la pagina deben estar los contactos de Gonzalo, el ig, la web y la dirección del maps

1.  Modulo de Agenda
La agenda debe ser la pantalla principal para cargar y organizar turnos.
Debe verse en forma de calendario, principalmente por semana, con bloques horarios.AGENDA
│
├── Vista semanal
       ├── Vista diaria
        ├── Bloques horarios
├── Crear turno
├── Editar turno
├── Reprogramar turno
├── Cancelar turno
├── Marcar como realizado
├── Marcar como no asistió
├── Bloquear horarios
└── Ver detalle rápido del turno
Vista semanal
La vista principal debe mostrar la semana completa, con horarios de cada 10 minutos.
Ejemplo:
Lunes      Martes      Miércoles      Jueves      Viernes      Sábado
10:10      
10:20      
10:30      
...

Cuando se agenda un turno, el bloque debe ocupar el tiempo real del turno.
Importante sobre los bloques
Los turnos no deben amontonarse visualmente.
Cuando un turno ocupa un horario, el bloque debe mostrar:
Nombre del cliente.
Hora de inicio.
Hora de finalización.
Después al tocar bloque del turno, deberá aparecer la demás información:Zona o servicio, Estado del turno, etc.

ESTADOS DEL TURNO (Cada uno puede tener un color distinto)
│
├── Señado
├── Realizado
├── Cancelado
├── Reprogramado
├── No asistió          Pendiente de autorización (Reserva online)
└── Pendiente de pago
Al hacer clic en un horario vacío
Debe abrirse una ventana para crear un nuevo turno.
Campos del nuevo turno:
NUEVO TURNO
├── Cliente existente o cliente nuevo
├── Nombre y apellido
├── WhatsApp
├── Email
├── Día del turno
├── Hora de inicio
├── Hora de finalización
├── Zonas que se va a depilar
├── Valor total
├── Valor de la seña
├── Observaciones(de donde llego? Orgánico, publicidad face/ig, otro)
└── Guardar turno
Al hacer clic en un turno ya cargado
Debe abrirse una ficha rápida del turno.
DETALLE DEL TURNO
│
├── Nombre y apellido
├── WhatsApp
├── Email
├── Día y horario
├── Zonas
├── Valor total
├── Seña
├── Estado del turno
├── Observaciones
├── Botón: Ver ficha completa
├── Botón: Enviar WhatsApp
├── Botón: Enviar email
├── Botón: Reprogramar
├── Botón: Cancelar
└── Botón: Marcar como realizado
El Cliente únicamente podrá:
Ingresar sus datos: Nombre Completo, wpp, mail
Elegir Servicios y seleccionar Zona (Con sus valores total y de la seña) 
Elegir Dia y horario disponible (Los bloques le aparecerán solo con la información de los horarios de inicialización y finalización de los turnos, nada de nombres ni zonas ni datos personales)
Darle las indicaciones previas a que haga el pago del turno
Pagar la seña y se le enviara un comprobante o recibo
Al finalizar la confirmación del turno por parte de Gonzalo, se confirmara por mail y wpp cuando el turno sea aprobado
Flujo de reserva online:
1. El cliente ingresa a la página pública de reserva.
2. Carga nombre, apellido, WhatsApp y email.
3. Selecciona servicio o zonas.
4. El sistema calcula precio estimado, seña y duración.
5. El cliente ve horarios disponibles.
6. El cliente selecciona día y horario.
7. El sistema muestra indicaciones previas y política de seña.
8. El cliente acepta condiciones.
9. El cliente paga la seña.
10. El turno queda como “Pendiente de autorización”.
11. Gonzalo/Luciano reciben una notificación interna.
12. Gonzalo/Luciano pueden aprobar o rechazar la reserva.
13. Si se aprueba:
    ├── el cliente recibe confirmación por email;
    ├── el cliente recibe confirmación por WhatsApp;
    └── el turno pasa a estado “Señado / Confirmado”.
14. Si se rechaza:
    ├── se notifica al cliente;
    ├── se define qué pasa con la seña;
    └── el horario vuelve a quedar disponible.

2. Modulo de Clientes
La ventana de clientes debe servir para buscar, filtrar y revisar las fichas completas.
CLIENTES
│
├── Buscador general
├── Filtros
├── Listado de clientes
├── Ficha completa del cliente
├── Historial de turnos
├── Historial de pagos
├── Zonas realizadas
├── Recordatorios
├── Acceso directo a WhatsApp
└── Observaciones internas
Buscador de clientes
Debe permitir buscar por nombre, fecha de turno 
FILTROS DE CLIENTES
├── Clientes nuevos
├── Clientes recurrentes
├── Clientes con turno próximo
├── Clientes sin próximo turno
├── Clientes que cancelaron
├── Clientes que no asistieron
├── Clientes por semana de turno

Ficha completa del cliente
La ficha del cliente debe ser el reemplazo digital de la ficha de papel.
FICHA DEL CLIENTE
│
├── Datos principales (Nombre completo, wpp, Mail, Fecha de Alta, Medio por el que llego, Estado de cliente)
├── Próximo turno
├── Zonas que se depila
├── Cada cuantas semanas se realiza el tratamiento (Todos arrancan cada 4 semanas)
├── Historial de sesiones / turnos
├── Pagos y señas
├── Cancelaciones / ausencias
├── Recordatorios enviados
├── Datos extra de Gonzalo
└── Notas internas
Próximo turno
Debe verse claramente el próximo turno del cliente.
PRÓXIMO TURNO
│
├── Día
├── Horario de inicio
├── Duracion del turno
├── Zonas que se va a depilar
├── Valor total
├── Valor de la seña
├── Saldo pendiente
├── Estado del turno
├── Estado del pago
└── Recordatorio enviado / pendiente

Historial de turnos del cliente
Esta parte debe funcionar igual que la lista que hoy se hace en la ficha de papel.
Cada nuevo turno se agrega debajo del anterior para mantener el historial completo.
REGISTRO DE TURNO
│
├── Fecha
├── Hora de inicio
├── Duracion
├── Zonas realizadas
├── Valor total
├── Valor de seña
├── Saldo pendiente
├── Si canceló, reprogramó o no asistio
└── Observaciones de ese turno
Ejemplo:
1) 12/05/2026 - 17:00 a 17:40
Zonas: Espalda + hombros
Valor: $40.000
Seña: $10.000
Estado: Realizado
Observación: buena tolerancia.

2) 20/06/2026 - 18:00 a 18:40
Zonas: Espalda + hombros
Valor: $43.000
Seña: $10.000
Estado: Confirmado

3) 30/07/2026 - 16:30 a 17:10
Zonas: Espalda + hombros
Valor: $43.000
Seña: $10.000
Estado: Cancelado por cliente 
La ficha debe calcular automáticamente:
├── Cantidad total de sesiones realizadas
 └── Tiempo desde la última sesión

Zonas que se va a depilar
La ficha debe permitir seleccionar una o varias zonas, danos la opción de modificar estos valores y tiempos.
ZONAS
│
├── Espalda – 28.000 - 30 minutos
├── Hombros -15.000 – 10 minutos
├── Pecho + Abdomen – 28.000 – 30 minutos
├── Axilas - 15.000 - 10 minutos
├── Brazos – 28.000 - 30 minutos
├── Piernas – 35.000 – 40 minutos
├── Glúteos – 22.000 - 20 minutos
├── Genitales – 22.000 – 20 minutos
├── Rostro – 30.000 – 30 minutos
├──└── Cuerpo Completo – 140.000 - 90 minutos └── Otro- Si lo pide el cliente, que escriba que zona busca, nos llegue notificación y nosotros le ponemos el valor y la cantidad de minutosCada zona elegida deberá sumarse para dar el valor final del costo del turno para los clientes, si somos nosotros los que agendan el turno, debemos tener la opción de quedarnos con el valor total sumado o modificarlo si es que aplicamos algún descuento.Para calcular la duración del turno1. Se toma la zona con mayor duración como duración principal.2. Las zonas adicionales suman el 50% de su duración base.3. Si el cliente es nuevo, se agregan 10 minutos extra.4. El resultado final se redondea hacia arriba al múltiplo de 10 más cercano.Ejemplo:Piernas: 40 minGlúteos: 20 min → suma 10 minAxilas: 10 min → suma 5 minTotal: 40 + 10 + 5 = 55 minRedondeo: 60 minSi es cliente nuevo:55 + 10 = 65 minRedondeo: 70 min

Acciones directas desde la ficha del cliente
Dentro de cada ficha debe haber botones rápidos.
ACCIONES EN LA FICHA
│
├── Ver próximo turno
├── Agendar nuevo turno
├── Enviar recordatorio por WhatsApp
├── Enviar recordatorio por email
├── Abrir WhatsApp del cliente
├── Registrar pago
├── Registrar seña
├── Marcar cancelación
├── Marcar no asistió
├── Agregar observación
└── Ver historial completo
Acceso directo a WhatsApp
La ficha debe tener un botón para abrir WhatsApp directamente con el cliente.
Ese botón debería abrir el chat con el número guardado.

3. Modulo de Estadísticas
La ventana de estadísticas debe permitir entender cómo está funcionando el negocio.
Debe mostrar cantidades de turnos, clientes, ganancias, pérdidas y cancelaciones.
ESTADÍSTICAS
│
├── Turnos nuevos por semana y mes 
├── Turnos totales por semana y mes
├── Clientes nuevos
├── Clientes recurrentes
├── Turnos realizados
├── Turnos cancelados
├── Turnos reprogramados
├── Clientes que no asistieron
├── Ganancias del día
├── Ganancias del mes
├── Pérdidas por cancelaciones
├── Pérdidas por ausencias
├── Señas cobradas
Estadísticas principales
Al entrar en estadísticas deberían verse tarjetas rápidas.
RESUMEN DEL MES
│
├── Clientes nuevos del mes
├── Turnos totales del mes
├── Turnos realizados del mes
├── Turnos cancelados del mes
├── Turnos no asistidos del mes
├── Ganancia mensual
├── Señas cobradas

Ganancias
La app debe calcular:
GANANCIAS
│
├── Ganancia del día
├── Ganancia de la semana
├── Ganancia del mes
├── Ganancia por cliente
├── Ganancia por clientes nuevos
Pérdidas
Es importante definir qué se considera pérdida.
PÉRDIDAS
│
├── Turnos cancelados sin reemplazo
├── Clientes que no asistieron
├── Horarios vacíos por cancelación
├── Saldos pendientes
├── Señas no abonadas
└── Turnos reservados que nunca se concretaron

Estadísticas de turnos
TURNOS
│
├── Turnos nuevos cargados
├── Turnos totales
├── Turnos realizados
├── Turnos cancelados
├── Turnos reprogramados
├── Turnos no asistidos
4. Modulo de Notificaciones
La ventana de notificaciones debe manejar recordatorios automáticos y manuales.
No debe ser un bot conversacional.
Debe ser un sistema para enviar recordatorios por WhatsApp y email.
NOTIFICACIONES
│
├── Recordatorios automáticos
├── Recordatorios manuales
├── Recordatorios por WhatsApp
├── Recordatorios por email
├── Plantillas de mensajes
├── Clientes agrupados por semana
├── Historial de envíos
├── Estado del envío
          Nueva Reserva online pendiente de autorización
          Nueva Seña Abonada
└── Alertas pendientes

Recordatorio semanal por WhatsApp
Actualmente se usa una etiqueta de WhatsApp con la semana del turno.
La app debería reemplazar o ayudar a automatizar esa lógica.
Debe existir una vista que agrupe automáticamente a los clientes según la semana de su turno.
RECORDATORIOS SEMANALES
│
├── Semana actual
├── Semana próxima
├── Clientes con turno esa semana
├── Botón para enviar recordatorio a todos

El Sabado anterior a una semana, enviamos el siguiente recordatorio por wpp:
“NO RESPONDER ESTE MENSAJE
Te recuerdo el turno de ESTA SEMANA para depilación láser, en el horario acordado.

Recordá que tenés que VENIR AFEITADO AL RAS.

IMPORTANTE: al ser turnos muy cortos, la tolerancia de demora por llegar tarde es de 5 minutos.

DIRECCIÓN:
Paraná 597, piso 8, depto 48. “
La app debería permitir guardar esta plantilla y modificarla cuando sea necesario.

Variables automáticas para mensajes
Las plantillas deberían poder completar datos automáticamente.
VARIABLES
│
├── [Nombre]
├── [Apellido]
├── [FechaTurno]
├── [Horario]
├── [Zonas]
├── [ValorTotal]
├── [Seña]
├── [Direccion]

Historial de notificaciones
Cada cliente debe tener un historial de mensajes enviados.
HISTORIAL DE NOTIFICACIONES
│
├── Fecha de envío
├── Hora de envío
├── Canal
│   ├── WhatsApp
│   └── Email
├── mensaje


Confirmación por email
Al cargar el turno y después de ser autorizado, la app debe poder enviar un email de confirmación.
EMAIL DE CONFIRMACIÓN
│
├── Nombre del cliente
├── Fecha del turno
├── Horario
├── Zonas
├── Dirección
├── Indicaciones previas
└── Datos de contacto
MODULO CONFIGURACION SI es posible-Para modificar las zonas, su duración y valores totales y de seña-Los horarios laborales
-Configurar los mensajes de los recordatorios y las confirmaciones de turno, además de las indicaciones
-Configuracion de usuarios y, permisos de administrador y de solo lectura (Clientes)