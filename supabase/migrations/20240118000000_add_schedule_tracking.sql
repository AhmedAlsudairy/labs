-- Add tracking columns to maintenance_schedule
ALTER TABLE maintenance_schedule
ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updated_by TEXT CHECK (updated_by IN ('manual', 'automatic')) DEFAULT 'automatic';

-- Add tracking columns to calibration_schedule
ALTER TABLE calibration_schedule
ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updated_by TEXT CHECK (updated_by IN ('manual', 'automatic')) DEFAULT 'automatic';
