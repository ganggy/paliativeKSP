CREATE DATABASE IF NOT EXISTS paliativeksp;
USE paliativeksp;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  fullname VARCHAR(255) NOT NULL,
  role ENUM('admin','doctor','nurse','staff','viewer') DEFAULT 'staff',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hn VARCHAR(50) UNIQUE,
  cid VARCHAR(20),
  fullname VARCHAR(255) NOT NULL,
  birthdate DATE,
  phone VARCHAR(50),
  address TEXT,
  diagnosis TEXT,
  palliative_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  pps_score INT,
  pain_score INT,
  esas_detail TEXT,
  assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE visits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  visit_date DATE,
  visit_type VARCHAR(100),
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);
