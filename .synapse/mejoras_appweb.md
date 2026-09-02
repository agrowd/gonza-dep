# Mejoras AppWeb - Documento del Cliente (Etapa 2)

> Extracción automática de texto e imágenes desde `Mejoras AppWeb.docx`


### Mejoras y Ampliaciones — App Web


### IMPORTANTE:

Realizar los cambios en un espacio de prueba con backup para no perder nada de lo anterior

También ir realizando las implementaciones de los módulos uno a uno, para poder ir revisandolos en profundidad individualmente


### Jerarquía Orden para la implementación


### Alta de turno


### Agenda


### Ficha


### Estadísticas


### Gastos


### Notificaciones

Configuración (Dejar Servicios, Boxes, Usuarios Y Promociones para el final)


### Clientes


### Generales


### Autogestión


### Multioperador y Agenda paralela

Todo lo relacionado con Agendas paralelas y alta de boxes, operadores, nuevos servicios, etc..

Dejo lo de la agenda paralela, el alta de Operadores y Boxes, y de nuevos servicios para el final ya que es lo más probable que se rompa ya que son cambios grandes, así que es mejor resolver primero lo anterior para que no se rompa todo junto, además que no es importante para ahora mismo


### GENERALES:


### 1. Roles y Niveles de Acceso

Administrador: acceso total (agenda, clientes, estadísticas, notificaciones, configuración, usuarios)

Operador: acceso solo a su agenda asignada, sus turnos y fichas de sus clientes (solo las zonas, nombre y apellido,y un apartado personal para agregar comentarios, pero no podrá ver cuánto pagan o los comentarios de administrador y datos personales).

Recepción: acceso a agenda general de los operadores, carga/edición de turnos, ficha de cliente básica; sin ver estadísticas ni configuración, ningún comentario ni de operador ni generales.

Usuario y contraseña individual por persona.


### MODULOS

Nuevo Modulo para tener encima de “Agenda” y abajo del Logo: “ALTA DE TURNO”:

Esta nueva Ventana, va a ser un atajo para ver en profundidad los horarios disponibles para agendar un turno sin tener que revisar toda la agenda semana por semana dia por dia

Al entrar al modulo de alta de turno, primero va a darnos la opcion de varios filtros, el primero con los checks de las zonas como antes para que se calcule automaticamente la duración del turno (Con la opción de modificar esa duracion si lo queremos), tambien tener la opcion de filtrar por rango horario como con las estadisticas, y tener otro filtro con checks para Lunes, Martes, Miércoles…etc.

Asi al filtrar por la duración de la zona y/o el rango horario y/o Los dias que queremos agendar ese turno, nos muestre en un calendario como te muestro en la foto, los dias en verde si cumplen esos requisitos pedidos o en gris si no cumple, al pulsar uno de estos dias de la agenda, se abre el listado de posibles horarios para agendar el turno


![image9.png](C:/Users/Try Hard/.gemini/antigravity/brain/01478f61-fff4-40e9-b3b8-fb734b8f792d/doc_assets/image9.png)

Por ejemplo si un cliente nos pide un turno para brazos, piernas y espalda, que puede despues de las 19:00 los Martes, Miércoles y Jueves, para no ir calculando si su turno entra y si estan disponibles los Martes, Miercoles, etc… Que en la agenda del mes aparezcan los dias que cumplan esos requisitos (Mar, Mierc y Jueves con espacios disponibles para la duración del turno entre las 19:00 y las 22:00), y al pulsar uno, aparezcan estos horarios cada 10 minutos para poder seleccionarlos

Ya después de haber seleccionado el dia y el horario, ir a la ventana “Nuevo turno” ya con esos datos de las zonas, y el dia y horario puestos, con los datos del valor, la seña y descuento para poder modificarlos y agendar el turno como siempre, guardando las zonas que ese cliente pidio en su anterior turno (si es que tiene un turno anterior)


### AGENDA:


### 1. Cambio Vista de agenda


![image8.png](C:/Users/Try Hard/.gemini/antigravity/brain/01478f61-fff4-40e9-b3b8-fb734b8f792d/doc_assets/image8.png)


### Tener una vista diaria como Neocita, con todos los turnos del mismo tamaño y

la misma info (Nombre, horario inicio y fin, duración, costo, zonas, box y operador que


### realiza la sesion, seña, si tiene descuento, etc)


### Al tocar “Programar siguiente turno” e ir a la vista mensual, deberían

aparecer con un fondo rojo si no es imposible ubicar un turno con la duración del turno

anterior,en verde si es posible ubicar un turno en ese dia en concreto, y gris si esta


![image7.png](C:/Users/Try Hard/.gemini/antigravity/brain/01478f61-fff4-40e9-b3b8-fb734b8f792d/doc_assets/image7.png)


### bloqueado


### 2. Bloqueo de dias

En vez de tener un cliente con el nombre “Bloqueado”, tener un boton arriba de la agenda, al lado del Boton “hoy”, que diga “Bloquear Horario, y ahi nos permita bloquear en un rango de horario especifico, dentro, tener la opcion de “Bloquear Dia En todas las agendas” QUE BLOQUEA EN TODAS LAS AGENDAS  y “Bloquar Dia”para bloquear el horario completo de una agenda en especifico (agregar filtro de las agendas disponibles para bloquear)


### Al tener un bloque ya bloqueado, al pulsarlo, tener la opción de desbloquear o modificar el rango horario del bloqueo


### 3. Cambios:

Al cancelar un turno, si se elije que se guarda la seña, al cargar el siguiente turno del cliente, abajo del campo de la seña debe aparecer el mensaje “Seña guardada”, y el valor de la seña ya puesto

Agregar un estado mas de turno además de “SEÑADO” que sea “CONSULTA”

Que el estado del turno predeterminado sea el de “SEÑADO” y no “PENDIENTE DE PAGO”

Al editar un turno, el sistema no debe mandar el mensaje o el mail al cliente si lo que se modifica el la hora DE FIN del turno (ya que puede pasar que nos confundimos con la duracion) pero si que mande cuando se modifique el horario INICIAL.

Al pulsar “nuevo turno” y poner el nombre del cliente para que se autocompleten sus datos, tambien deben autocompletarse los datos de las zonas, el valor y la seña usadas en su ultimo turno anterior (si es que tiene), y en el caso que su ultimo turno haya sido cancelado, en el campo de seña, debe dar un aviso de “Seña guardada”(completando este campo ya que se guardo la seña para el siguiente turno) o “seña perdida” para saber si tiene que pagar la seña o no

En la lista de turnos que se imprime como PDF, agregar abajo del Horario de cada turno, el valor del Mismo, y debajo de todos los turnos, la suma del total de los valores (Aca si lo contaremos junto con las señas de esos turnos, a diferencia de en Estadísticas)

En el historial de turnos, si el turno de un cliente fue cancelado, que diga si la seña se perdio o se conservo


### 4. Turnos:

Ahora a los turnos agendados, al pulsarlos, vamos a hacerle unos cambios

En de tener “Realizado” para marcar que se realizo el turno, que vamos a borrarlo, vamos a tener

“Siguiente turno”: va a tener el mismo funcionamiento que ahora, solo que tambien va a contar como que el turno fue realizado, poniéndolo en el estado realizado

“Va a avisar”: Va a contar como turno Realizado tambien, va a aparecer en el historial de turnos con la etiqueta “Va a avisar” solo que con la diferencia que no agendo un nuevo turno. (A estos en Notificaciónes Les va a mandar un mensaje depende las semanas que diga en su ficha para recordarles de agendar un nuevo turno)

“Mantenimiento”: Va a contar ese turno como realizado, va a aparecer en el historial con la etiqueta de Mantenimiento y le va a mandar el mensaje de mantenimiento 2,5 meses después

“Finalizo”: Va a contar como turno realizado, va a aparecer en el historias con la etiqueta de Finalizado y le va a mandar el mensaje de Mantenimiento 2,5 meses después

Agregar boton de Mandar Reseña: Le envia al wpp un mensaje con el Link para mandar reseñas (Con el texto editable en Configuracion)

Agregar a la info del turno, el check para activar y desactivar las notificaciones, tambien al momento de agendar un nuevo turno, despues de poner el Nombre y que se autocomplete su info, agregar el check, prendido o apagado segun lo que diga la configuracion de la ficha del cliente

Al “Agendar un nuevo turno” y se ponga el nombre del cliente para que se autocomplete su info, tambien que se autocompleten las zonas que se hizo en su ultima sesion para no tener que ir a buscarlas a su ficha


### CONFIGURACION:Ahora en Configuración habran 7 pestañas:  Servicios (Reemplazará a Zonas de Depilación), Horarios Laborales, Mensajes y Plantillas, Usuarios, Parámetros ,Cupones y Promociones Y boxes1. Boxes


![image4.png](C:/Users/Try Hard/.gemini/antigravity/brain/01478f61-fff4-40e9-b3b8-fb734b8f792d/doc_assets/image4.png)


### Para dar de alta un box, se le da un horario de atencion especifico, que al construir su agenda, use esos horarios, sin modificar las agendas de otros boxes o de administrador, que sean independientes, tambien se indica para que servicio se usara ese box (dependiendo lo que diga en “Servicios”)


### Se pueden eliminar estos boxes, menos el de administrador


### 2.Usuarios


### Desde el perfil de administrador administrador, en  “usuarios”, ver que usuarios se registraron en cada Rol, y poder a través de checks, mover de rol (Operador, Recepcionista o Administrados) o agregarle mas roles, como tambien agregarle o sacarle servicios (Depende los que hayan en la pestaña de “Servicios”).

Alta de operadores desde Configuración: El administrador podrá dar de alta a un operador en “Usuarios”, tocando “dar de alta nuevo usuario”, ingresando nombre, mail y, usuario y contraseña para que puedan ingresar a su sesión, indicando su rol y nivel de acceso específico, servicios que realiza (Según los que hayan en servicios), horario laboral propio y comisión(Indicando si es por dia, por turno o por hora). por lo que aparte de el apartado de “Horarios Laborales” que estará para la agenda de administrador, deberá estar independiente para cada operador cargado, En configuración, dentro de “Usuarios”, modifica o canceló cada turno. (ENTRE RECEPCIONISTA Y ADMINISTRADORES)

Un operador puede tener múltiples servicios asignados..


### 3.Parámetros

Configuración del plazo de pérdida de seña desde un panel, sin depender de un pedido de desarrollo para cada ajuste. Reglas distintas por servicio (ej. depilación láser 72hs, masajes 24hs).

Poder agregar canales de obtención de clientes (Por si creamos una campaña)

Cambiar Parametros en los que se envien lso mensajes y notificaciones.Ejemplo, si quiero que los mensajes de recordatorio se envien 24 horas antes en vez de 48, o si el mensaje de 1 semana antes se envie 4 dias antes.

Cambio de Formula para calculo de Tiempo turnos: Antes usábamos la zona con el turno más largo como base para después sumarle todos los siguientes turnos a la mitad de tiempo, queremos mejorar esa formula para que no queden turnos excesivamente largos:

La idea principal es Usar el tiempo de zona mas larga + ⅓ de las demás zonas, con reglas extra


### si hay 4 zonas o mas, restar 10 minutos


### redondear al siguiente múltiplo de 10 como antes

Si es posible, que nos permita modificar esta formula por si en el futuro se quiere cambiar


### 4. Servicios:

En Configuración, Renombrar “Zonas De depilación” por “Servicios”, para poder agregar más servicios más allá de depilación láser: Masajes, Faciales, tener la posibilidad de agregar mas servicios con sus zonas específicas

Debe Estar ya implementada la ventana del servicio de “Depilación laser” con las mismas zonas, valores y tiempos que antes, como estaba antes.

Cada servicio se le podrá agregar sus zonas con nombre, duración, precio, seña.

Al momento de cargar un turno, deberán aparecer estos servicios en forma de ventanas cerradas donde al seleccionarlas, se abrirán y mostraran sus zonas, para seleccionar, y debajo de las ventanas mostrará lo mismo que antes,los horarios, los descuentos y el valor total por todos los servicios seleccionados.


![image6.png](C:/Users/Try Hard/.gemini/antigravity/brain/01478f61-fff4-40e9-b3b8-fb734b8f792d/doc_assets/image6.png)


### 5. Promociones y Cupones


### Promociones por combinación de zonas

Módulo de Configuración > Promos: elegir una combinación fija de zonas + descuento (% o monto).

Al seleccionar esas zonas exactas en un turno, el sistema sugiere automáticamente la promo activa.

Vigencia por fecha, con historial de turnos que la usaron.

Tener un check en cada promoción creada para poder activarla o desactivarla


### Cupones de descuento

Apartado propio en Configuración, independiente de la promo por zonas.

Campos: código que despues ingresara el cliente, porcentaje o monto de descuento, cantidad de usos permitidos (o cantidad de sesiones en los que aplicará el descuento), fecha de vencimiento, check activado/desactivado.

El sistema descuenta un uso disponible cada vez que se aplica, aunque se cancele el turno; al llegar a 0 usos o vencer la fecha, se desactiva solo.


### 6. Mensajes y Plantillas

Agregar otra plantilla de texto para mensajes de Wpp y Mail para los clientes que tengan “Van a Avisar” en su ultimo turno para poder modificar el recordatorio de agendar un nuevo turno

Posibilidad de agregar imagenes a los mensajes, que se envíen justo después de los mensajes


### ESTADISTICAS:


### VAMOS A TENER 2 VENTANAS EN ESTADÍSTICAS:

Estadísticas Generales: lo mismo que tenemos ahora en estadisticas, va a ser la segunda ventana con los siguientes cambios

LAS GANANCIAS  DEL MES y de la semana y del dia deben ir llenándose segun vayan pasando los turnos, sin contar las señas ya cobradas como hace ahora, ya que las señas se sumaran a la ganancia del dia que se cobro

Al momento de agendar un turno, la seña se ingresa el dia que se cargo el turno, no para el dia del turno, asi que debe sumarse para las ganancias del dia agendado, y al momento del turno, no se va a sumar la seña como ganancia, ya que ya se conto para el dia que se agendo

Separar las Entradas del dia en “Entradas de turnos” y “Entradas de señas pagadas”, y despues el total

También cambiar la estadistica de “reprogramados” y “pendientes de cobro” por la estadistica de la cantidad de clientes en va a avisar y finalizado

“Turnos realizados” (como ahora vamos a tener los botones de “Agendar proximo turno”, Mantenimiento, “Va a avisar” y Finalizado para marcar que el turno fue realizado), va a contar los clientes los cuales su ultimo turno realizado tenga alguna de esas etiquetas

Estadísticas Avanzadas: En esta ventana, que sera la principal del modulo de Estadisticas (Osea sera la que deberá aparecer al ingresar a estadísticas), trabajaremos con un selector para elegir la Estadistica que queramos ver, al elegir una, se abre la información de la cantidad de clientes que cumplen esa definicion, la cantidad de ganancia/valor total, y se podra desglosar la lista de clientes que componen la estadística

Al elegir el rango de fechas, Los campos que estaran en el selector/filtro seran los siguientes:


### Turnos Realizados:

Al seleccionar realizados(la suma de los turnos con las etiquetas de realizado, ya sea por “Agendar proximo turno”, Mantenimiento, “Va a avisar” y Finalizado), se despliega la información de cuantos turnos fueron realizados, cuánto fue el ingreso total de los turnos realizados y el ticket promedio por cliente

Y un desplegable “DETALLES” que muestre la lista de todos los clientes turnos realizados en ese rango, con la información de la fecha y horario de ese turno, valor y seña, zonas, además agregar 3 botones, un boton “X” para sacar a un cliente en particular de la lista y que calcule todo sin ese cliente (Despues volvera a estar en la lista), otro boton que diga “Turno” que nos mande a la agenda a ese turno en particular y otro que diga ficha, que nos enviara a la ficha del cliente (En cuanto se cierre la ventana del turno o de la ficha, se deberá volver al mismo lugar que antes)


### Turnos Señados/Confirmados:

Mostrará los clientes con turnos Señados/confirmados, con la misma informacion que los realizados (Cantidad, ganancia, y el ticket promedio por cliente ), con el Desplegable de detalles para ver la lista de clientes con turnos señados, con los mismos 3 botones que los realizados en cada cliente de la lista,


### Turnos Cancelados:

Mostrara los clientes con turnos cancelados(los que segun su historial, su ultimo turno fue cancelado), con la información de la cantidad de turnos cancelados y perdida, el despegable para ver la lista de clientes que cancelaron en ese rango, con los mismos 3 botones que realizados


### Turnos Ausentes:

Mostrara los clientes con turnos ausentes(los que segun su historial, su ultimo turno fue ausente), con la informacion de la cantidad de turnos ausentados y perdida, el despegable para ver la lista de clientes que faltaron a su turno en ese rango, con los mismos 3 botones que realizados


### Turnos Sin Marcar:

Mostrar los clientes con turnos que ya pasaron, pero que nunca se les cambio el estado, con la información de la cantidad de turnos sin cambiar, el despegable para ver la lista de estos turnos y poder ir a cada uno y cambiarles el estado


### Clientes “Va a avisar”:

Mostrara los clientes con la etiqueta “Va a avisar” los cuales (Segun su ultimo turno tenga la etiqueta de “Va a avisar”) con la informacion de la cantidad de “clientes va a avisar” y perdida (tomando el valor del ultimo turno realizado, seria la perdida por no haberles agendado un turno nuevo) , el despegable para ver la lista de clientes en ese rango, con los mismos 3 botones que realizados


### Clientes “Mantenimiento”:

Mostrará los clientes , los cuales, segun la etiqueta de su ultimo turno, quedo con la etiqueta de “Mantenimiento”, con la informacion de la cantidad de los clientes y perdida(lo mismo que con los “van a avisar”), el desplegable para ver la lista de clientes que cancelaron en ese rango, con los mismos 3 botones que realizados. (A estos se les enviara el mensaje 2,5meses despues)


### Clientes “Finalizo”:

Mostrará los clientes, los cuales, segun la etiqueta de su ultimo turno, quedo con la etiqueta de “Finalizado”, con la informacion de la cantidad de los clientes y perdida(lo mismo que con los “van a avisar”), el desplegable para ver la lista de clientes que cancelaron en ese rango, con los mismos 3 botones que realizados. (A estos se les enviara el mensaje 2,5meses despues)


### Clientes Nuevos:

Mostrará los clientes nuevos con turno agendado, tendra un filtro con checks con los canales de adquisición (agregando la posibilidad de modificar o sumar nuevos canales si queremos), con la información de la cantidad de turnos de clientes nuevos y ganancia y el ticket promedio por cliente , el desplegable para ver la lista de clientes nuevos que ingresaron en ese rango con los canales que tengan el check activado, con los mismos 3 botones que realizados en cada cliente

tambien por abajo mostrara un histograma con la cantidad de clientes nuevos por canal de adquisicion


### Zonas

Segun las zonas que esten en Configuracion, tendra 2 filtros con checks, uno con las zonas, para ver la informacion de una en especifico o varias (tener la opcion de “Todas”) y otro filtro con check con la opciones de “Turnos realizados”, “turnos señados/confirmados” y “todos” asi podemos ver, de los turnos proximos o pasados, cuales fueron las zonas mas pedidas, se dara una grafica (Histograma o lo que sea) con las zonas en orden con la cantidad de clientes que pidieron esas zonas, el despegable para ver la lista de clientes que agendaron esa zona, con los mismos 3 botones que realizados en cada cliente


### Operador

Segun los operadores dados de alta en Configuracion, tendra el filtros con checks, para elegir uno o varios de los operadores de la lista a los cuales se quiere ver, y otro filtro con check con la opciones de “Turnos realizados”, “turnos señados/confirmados” y “todos” asi podemos ver, de los turnos proximos o pasados, cuales son de ese operador en concreto, tendra tambien la informacion de la comisión total en ese rango que le corresponde al operador (si es que tiene comision por turno, dia o mes) y el desplegable “Detalles” para ver la lista de clientes con turno con ese operador


### CLIENTES

-agregar filtro para los que tengan las notificaciones activadas y desactivados

Que en la lista de cleintes agregar un check para poder activar sus notificaciones desde ahi


![image2.png](C:/Users/Try Hard/.gemini/antigravity/brain/01478f61-fff4-40e9-b3b8-fb734b8f792d/doc_assets/image2.png)


![image11.png](C:/Users/Try Hard/.gemini/antigravity/brain/01478f61-fff4-40e9-b3b8-fb734b8f792d/doc_assets/image11.png)


### AUTOGESTION:

Cuando un cliente pone su mail y no esta registrado en el sistema, que le pida los datos antes de ofrecerle las zonas y los horarios

Que los horarios que le muestren a los clientes cuando ya eligieron zonas se comporten así:

Si es un día sin turnos, le da todo el día disponible como está ahora

Si es un día con turnos, que los horarios disponibles sean lo que estén antes y después de estos turnos para que queden pegados, Masomenos la duración del turno X2 para cada lado (para un turno de 30 minutos muestra 1 hora para cada lado de los turnos ya agendados, para un turno de 90 minutos muestra 3 horas para cada lado) mientras sigan dentro del rango de horarios

Ej: si en ese día hay turnos de 15:30 a 16:00 y de 17:00 a 17:40

Para un turno que dura 30 minutos, le muestran los horarios en los rangos desde las 14:30 a 15:30(para que entre el turno de 30), de las 16:00 a 17:00, y de 17:40 hasta las 18:40 (bloqueando los horarios ocupados como ahora)

Para un turno que dura 60 minutos, le muestras los horarios desde las 14:00 a las 15:00(para que entre un turno de 60), el horario de las 16:00 que entra justo y de 17:40 hasta las 19:40

Al Tener un dia completo en la agenda (es decir que no entre ningun hueco con la duracion del turno que pone el cliente) Que no deje pulsar para abrir ese dia y que muestre con fondo rojo el recuadro del dia, simbolizando que no esta disponible

Al modificar un turno, saltearse la pantalla donde aparece sus zonas elegidas e ir directamente a la pantalla de horarios, ya que no se les permitirá cambiar las zonas por autogestion

ESTO SERIA PARA CUANDO ESTE IMPLEMENTADO LO DE LOS OPERADORES Y LA AGENDA MULTIPLE

El cliente, después de ingresar su mail y verificar que no tenga un turno pendiente, elige primero el servicio como ventanas expandibles y elija las zonas del servicio.

Horarios filtrados por servicio + operador, si se elige el servicio de Masajes, unicamente va a mostrar los horarios disponibles de la agenda del operador que realice ese servicio

Asignación automática de operador.


### NOTIFICACIONES:

Reemplaza el check único actual por configuración más completa:

EN LA FICHA del cliente Checks separados por canal (WhatsApp / Email) y por tipo de notificación (Alta de turno, Cancelación, Reprogramación, Recordatorio de mantenimiento).


### Configurable por cliente

Al Mensaje de Alta de Turnos, dividirlo en 2 distintos, uno que sea cuando se le dan un turno a un cliente por primera vez, y otro para cuando se le dan un turno a un cliente que ya tuvo turno, porque tienen que tener información distinta

Recibir notificaciones cuando un cliente toma un turno por autogestión, para saber antes de dar el turno


### FICHAS:1.Exportar lista de clientes

Botón "Exportar" en Clientes, que descarga un Excel/CSV con los clientes filtrados en pantalla (nuevos, recurrentes, por zona, etc.).


### 2. Comercial

Al enviar un recibo, debe ser un archivo como este.


![image3.png](C:/Users/Try Hard/.gemini/antigravity/brain/01478f61-fff4-40e9-b3b8-fb734b8f792d/doc_assets/image3.png)


### 3. Historial de Turnos interactivo

Al pulsar un turno del historial de turnos en la ficha de un cliente, envíe a la agenda al día de ese turno, dando la información como si se hubiese pulsado desde la agenda, y al cerrarlo, vuelva al historial sobre el turno que se pulso, tambien debe pasar con el campo “Ultima sesion” y “Proximo turmo” (que estan antes del historial de turno), que deben enviar a sus respectivos turnos


### 4.Ficha de cliente

Botón "Descargar PDF" en la ficha del cliente, que exporta datos, historial de turnos, pagos y observaciones.

Al realizar una observación ya sea general o de operador (que delante del comentario) se sume la fecha en la que se hizo para mantener registro

Agregar Fecha de Nacimiento opcional para los datos del cliente, asi por NOTIFICACIONES, se puede enviar un mensaje de Feliz cumpleaños (editable en Configuración) el mismo dia de cumpleaños

Que los Campos de DNI y de Whatsapp sean campos Numericos, ahora se esta permitiendo poner letras

NUEVO!!!! GASTOS: Vamos a agregar un nuevo módulo llamado Gastos entre Estadisticas y Notificaciones, solo se trabajara de forma MENSUAL, osea que no tendra rango horario, donde ingresamos los gastos con su nombre, cantidad, categoría y fecha, habrá un historial para poder ver todos los gastos cargados y un historial general, y una estadística con la cantidad de plata gastada por cada categoría

Se podran modificar y agregar mas categorias, eligiendo un color para diferenciarlos

Al haber pasado un mes de guardara el la estadística de los gastos del mes pasado en una tarjeta, así tenemos el gasto de ellos meses anteriores para poder comparar

Mostrar también el balance de los gastos y las entradas día a día, y en los historiales dando el balance de cada mes


### 1. Multi-operador y Agendas Paralelas

Agenda propia por box, visualizable individualmente, sin interrumpir ni superponerse con las agendas de los demás boxes (Cada operador solo podrá ver su agenda desde su sesión)

IMPORTANTE, al momento de realizar este cambio, todos los turnos ya cargados, van a estar en la agenda de administrador, que sea la agenda principal de Gonzalo, no se va a poder eliminar esta agenda, tendrá el mismo horario de atención que ahora, para no perder todos esos turnos, y después al crear más boxes con sus agendas independientes, se irán agregando al filtro

Para Administrador y Recepcionista, tener un filtro para elegir visualizar la Agenda y Clientes por operador, pudiendo moverse de una agenda a otra solo con ese filtro. (Tener de predeterminado el filtro en “Todos” menos en la agenda que lo predeterminado debe ser la del administrador)


![image1.png](C:/Users/Try Hard/.gemini/antigravity/brain/01478f61-fff4-40e9-b3b8-fb734b8f792d/doc_assets/image1.png)


![image5.png](C:/Users/Try Hard/.gemini/antigravity/brain/01478f61-fff4-40e9-b3b8-fb734b8f792d/doc_assets/image5.png)


![image11.png](C:/Users/Try Hard/.gemini/antigravity/brain/01478f61-fff4-40e9-b3b8-fb734b8f792d/doc_assets/image11.png)


![image11.png](C:/Users/Try Hard/.gemini/antigravity/brain/01478f61-fff4-40e9-b3b8-fb734b8f792d/doc_assets/image11.png)

Al momento de cargar nuevo turno, además de todo lo que estaba antes, agregar un filtro para elegir en que box se agregara ese turno, osea en que agenda se agendara el turno ,estando como predeterminada la agenda de Administrador, también otro filtro para elegir que operador realizara el servicio.

Al pulsar “Agendar nuevo turno”,se debe guardar el box y operador que se eligio en el anterior turno, al igual que toda la información como las zonas, el valor, la seña, el descuento, etc.
