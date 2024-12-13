-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 13, 2024 at 05:56 AM
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
-- Table structure for table `booking`
--

CREATE TABLE `booking` (
  `idBooking` int(11) NOT NULL,
  `pasienId` int(11) NOT NULL,
  `jadwalId` int(11) NOT NULL,
  `tanggalBooking` datetime NOT NULL,
  `metodePendaftaran` enum('online','offline') NOT NULL DEFAULT 'online',
  `status` enum('aktif','selesai','batal') NOT NULL DEFAULT 'aktif',
  `nomorAntrian` varchar(10) DEFAULT NULL,
  `statusAntrian` enum('menunggu','dipanggil','selesai') DEFAULT 'menunggu',
  `statusPembayaran` enum('belum_bayar','lunas') DEFAULT 'belum_bayar'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `booking`
--

INSERT INTO `booking` (`idBooking`, `pasienId`, `jadwalId`, `tanggalBooking`, `metodePendaftaran`, `status`, `nomorAntrian`, `statusAntrian`, `statusPembayaran`) VALUES
(1, 4, 2, '2024-12-04 23:00:34', 'offline', 'aktif', NULL, 'selesai', 'belum_bayar'),
(2, 4, 2, '2024-12-04 23:00:42', 'online', 'aktif', '1', 'selesai', 'lunas'),
(4, 15, 15, '2024-12-11 14:45:15', 'offline', 'aktif', '3', 'menunggu', 'belum_bayar'),
(5, 4, 15, '2024-12-11 14:47:51', 'offline', 'aktif', '4', 'menunggu', 'belum_bayar'),
(6, 15, 4, '2024-12-13 11:37:35', 'offline', 'aktif', '1', 'menunggu', 'belum_bayar');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `booking`
--
ALTER TABLE `booking`
  ADD PRIMARY KEY (`idBooking`),
  ADD KEY `pasienId` (`pasienId`),
  ADD KEY `jadwalId` (`jadwalId`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `booking`
--
ALTER TABLE `booking`
  MODIFY `idBooking` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `booking`
--
ALTER TABLE `booking`
  ADD CONSTRAINT `booking_ibfk_1` FOREIGN KEY (`pasienId`) REFERENCES `user` (`idUser`),
  ADD CONSTRAINT `booking_ibfk_2` FOREIGN KEY (`jadwalId`) REFERENCES `jadwal_dokter` (`idJadwal`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;