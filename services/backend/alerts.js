// ALERT ENGINE - SIMPLIFIED VERSION

class AlertEngine {
  constructor(pg, io) {
    this.pg = pg;
    this.io = io;
  }

  async processDeviceUpdate(tenant, deviceId, lat, lon, sensors) {
    try {
      // Obtener reglas activas
      const rules = await this.pg.query(
        'SELECT * FROM alert_rules WHERE tenant = $1 AND active = true',
        [tenant]
      );

      for (const rule of rules.rows) {
        if (rule.type === 'inactivity') {
          await this.checkInactivity(tenant, deviceId, rule);
        } else if (rule.type === 'sensor_range') {
          await this.checkSensorRange(tenant, deviceId, rule, sensors);
        }
      }
    } catch (err) {
      console.error('Alert engine error:', err);
    }
  }

  async checkInactivity(tenant, deviceId, rule) {
    const durationMinutes = rule.condition.duration_minutes;
    const result = await this.pg.query(
      'SELECT event_time FROM camiones WHERE device_id = $1 ORDER BY event_time DESC LIMIT 1',
      [deviceId]
    );

    if (result.rows.length === 0) return;

    const lastTime = new Date(result.rows[0].event_time);
    const minutesAgo = (Date.now() - lastTime.getTime()) / 60000;

    if (minutesAgo > durationMinutes) {
      await this.createAlert(tenant, rule.id, deviceId, 'inactivity', 'high',
        `Device inactive for ${minutesAgo.toFixed(1)} min`, rule);
    }
  }

  async checkSensorRange(tenant, deviceId, rule, sensors) {
    const { temp_max } = rule.condition;
    if (temp_max && sensors?.temperature > temp_max) {
      await this.createAlert(tenant, rule.id, deviceId, 'sensor_range', 'medium',
        `Temperature too high: ${sensors.temperature}°C`, rule);
    }
  }

  async createAlert(tenant, ruleId, deviceId, type, severity, description, rule) {
    try {
      const existing = await this.pg.query(
        `SELECT id FROM alerts WHERE device_id = $1 AND alert_type = $2 
         AND status = 'active' AND created_at > NOW() - INTERVAL '5 minutes'`,
        [deviceId, type]
      );

      if (existing.rows.length > 0) return; // Evitar duplicados

      await this.pg.query(
        `INSERT INTO alerts (tenant, rule_id, device_id, alert_type, severity, title, description, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')`,
        [tenant, ruleId, deviceId, type, severity, description, description]
      );

      // Emitir por Socket.IO
      this.io.to(`tenant:${tenant}`).emit('alert', {
        device_id: deviceId,
        type, severity,
        message: description,
        timestamp: new Date().toISOString()
      });

      console.log(`🚨 Alert: ${type} - ${deviceId}`);
    } catch (err) {
      console.error('Error creating alert:', err);
    }
  }
}

module.exports = AlertEngine;
