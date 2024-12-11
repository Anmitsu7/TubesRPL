-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 11, 2024 at 04:38 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `klinikrpl2`
--

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `idUser` int(11) NOT NULL,
  `namaUser` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `tanggalLahir` date DEFAULT NULL,
  `alamat` text DEFAULT NULL,
  `nomorTelepon` varchar(20) DEFAULT NULL,
  `role` enum('pasien','dokter','admin','perawat') DEFAULT 'pasien'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`idUser`, `namaUser`, `email`, `password`, `tanggalLahir`, `alamat`, `nomorTelepon`, `role`) VALUES
(1, 'Dr. John Doe', 'john.doe@klinik.com', '$2a$10$XYZ123', '1980-01-15', 'Jl. Dokter No. 10', '081234567890', 'dokter'),
(2, 'Dr. Jane Smith', 'jane.smith@klinik.com', '$2a$10$ABC456', '1975-05-20', 'Jl. Dokter No. 20', '082345678901', 'dokter'),
(3, 'Patient User', 'patient@example.com', '$2a$10$DEF789', '1990-10-10', 'Jl. Pasien No. 30', '083456789012', 'pasien'),
(4, 'kensi', 'kensi@gmail.com', '$2a$10$op/82W3unuGPlwfG80K8UOWqiEYosXO7drWft.umiXZdXvxmQUiaC', '2003-04-30', 'pasko', '0822', 'pasien'),
(5, 'admin', 'admin@gmail.com', 'admin', '2001-12-01', 'bukit jarian', '0812', 'admin'),
(7, 'tes', 'tes@gmail.com', '$2a$10$WV4.2hB2Imw61zRlLjcZMeueuLJWpmPN36ggS84Js/rOB9bRrmLYW', '2001-01-01', 'bukitjarian', '0822', 'pasien'),
(9, 'tes2', 'tes2@gmail.com', '$2a$10$A3gBZj8BzZnitwdcxzW6retxrdf0/paP0ZgJU7Rys01Qffd3zT47.', '2001-01-01', 'bukitjarian', '0822', 'pasien');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`idUser`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `idUser` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
