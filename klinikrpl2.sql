-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 11, 2024 at 02:33 PM
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
(1, 4, 2, '2024-12-04 23:00:34', 'offline', 'aktif', NULL, 'menunggu', 'belum_bayar'),
(2, 4, 2, '2024-12-04 23:00:42', 'online', 'aktif', '1', 'menunggu', 'belum_bayar'),
(4, 15, 15, '2024-12-11 14:45:15', 'offline', 'aktif', '3', 'menunggu', 'belum_bayar'),
(5, 4, 15, '2024-12-11 14:47:51', 'offline', 'aktif', '4', 'menunggu', 'belum_bayar');

-- --------------------------------------------------------

--
-- Table structure for table `jadwal_dokter`
--

CREATE TABLE `jadwal_dokter` (
  `idJadwal` int(11) NOT NULL,
  `dokterId` int(11) NOT NULL,
  `hari` enum('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu') NOT NULL,
  `jamMulai` time NOT NULL,
  `jamSelesai` time NOT NULL,
  `kuotaOnline` int(11) NOT NULL DEFAULT 0,
  `kuotaOffline` int(11) NOT NULL DEFAULT 0,
  `sisaKuotaOnline` int(11) NOT NULL DEFAULT 0,
  `sisaKuotaOffline` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `jadwal_dokter`
--

INSERT INTO `jadwal_dokter` (`idJadwal`, `dokterId`, `hari`, `jamMulai`, `jamSelesai`, `kuotaOnline`, `kuotaOffline`, `sisaKuotaOnline`, `sisaKuotaOffline`) VALUES
(2, 1, 'Senin', '08:00:00', '16:00:00', 10, 5, 8, 4),
(3, 1, 'Rabu', '09:00:00', '17:00:00', 8, 7, 8, 6),
(4, 1, 'Jumat', '10:00:00', '18:00:00', 12, 6, 12, 6),
(5, 2, 'Selasa', '08:30:00', '16:30:00', 9, 6, 9, 6),
(6, 2, 'Kamis', '09:30:00', '17:30:00', 7, 8, 7, 8),
(7, 2, 'Sabtu', '07:00:00', '15:00:00', 11, 5, 11, 5),
(8, 10, 'Senin', '09:00:00', '15:00:00', 10, 8, 10, 8),
(9, 10, 'Rabu', '13:00:00', '19:00:00', 8, 6, 8, 6),
(10, 10, 'Jumat', '08:00:00', '14:00:00', 12, 8, 12, 8),
(11, 11, 'Selasa', '07:00:00', '13:00:00', 10, 7, 10, 7),
(12, 11, 'Kamis', '14:00:00', '20:00:00', 8, 6, 8, 6),
(13, 11, 'Sabtu', '09:00:00', '15:00:00', 12, 8, 12, 8),
(14, 12, 'Senin', '14:00:00', '20:00:00', 10, 8, 10, 8),
(15, 12, 'Rabu', '08:00:00', '14:00:00', 8, 6, 8, 4),
(16, 12, 'Jumat', '13:00:00', '19:00:00', 12, 8, 12, 8),
(17, 13, 'Selasa', '13:00:00', '19:00:00', 10, 8, 10, 8),
(18, 13, 'Kamis', '08:00:00', '14:00:00', 8, 6, 8, 6),
(19, 13, 'Sabtu', '07:00:00', '13:00:00', 12, 8, 12, 8),
(20, 1, 'Minggu', '08:00:00', '13:00:00', 8, 5, 8, 5),
(21, 10, 'Minggu', '13:00:00', '18:00:00', 8, 5, 8, 5);

-- --------------------------------------------------------

--
-- Table structure for table `riwayat_medis`
--

CREATE TABLE `riwayat_medis` (
  `idRiwayatMedis` int(11) NOT NULL,
  `idPasien` int(11) NOT NULL,
  `tanggal` datetime NOT NULL,
  `diagnosa` text DEFAULT NULL,
  `resep` text DEFAULT NULL,
  `catatan` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `riwayat_medis`
--

INSERT INTO `riwayat_medis` (`idRiwayatMedis`, `idPasien`, `tanggal`, `diagnosa`, `resep`, `catatan`) VALUES
(1, 3, '2024-01-15 10:30:00', 'Flu Ringan', 'Paracetamol, Vitamin C', 'Istirahat yang cukup'),
(2, 3, '2024-02-20 14:45:00', 'Demam', 'Antibiotik, Obat Penurun Panas', 'Kontrol ulang dalam 3 hari');

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int(11) UNSIGNED NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sessions`
--

INSERT INTO `sessions` (`session_id`, `expires`, `data`) VALUES
('b27GEqpilvSrS3D1VCS1kqx9k4CLJ88c', 1734010286, '{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2024-12-12T13:30:00.875Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"strict\"},\"flash\":{},\"user\":{\"idUser\":5,\"namaUser\":\"admin\",\"email\":\"admin@gmail.com\",\"role\":\"admin\"}}'),
('jIlevX-oRouLBwbdH2TyK_6fXkFSK0M-', 1734006909, '{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2024-12-12T12:35:07.269Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"strict\"},\"flash\":{},\"user\":{\"idUser\":5,\"namaUser\":\"admin\",\"email\":\"admin@gmail.com\",\"role\":\"admin\"}}');

-- --------------------------------------------------------

--
-- Table structure for table `transaksi`
--

CREATE TABLE `transaksi` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `pasienId` int(11) NOT NULL,
  `dokterId` int(11) NOT NULL,
  `tanggal` timestamp NOT NULL DEFAULT current_timestamp(),
  `totalBiaya` decimal(10,2) NOT NULL,
  `status` varchar(50) DEFAULT 'Pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(9, 'tes2', 'tes2@gmail.com', '$2a$10$A3gBZj8BzZnitwdcxzW6retxrdf0/paP0ZgJU7Rys01Qffd3zT47.', '2001-01-01', 'bukitjarian', '0822', 'pasien'),
(10, 'perawat', 'perawat@klinik.com', 'perawat', '1980-01-15', 'Jl. Perawat No. 20', '081234528009', 'perawat'),
(11, 'Dr. Sarah Wilson', 'sarah.wilson@klinik.com', '$2a$10$XYZ789', '1985-03-25', 'Jl. Melati No. 15', '081234567891', 'dokter'),
(12, 'Dr. Michael Chen', 'michael.chen@klinik.com', '$2a$10$ABC101', '1982-07-12', 'Jl. Anggrek No. 8', '081234567892', 'dokter'),
(13, 'Dr. Amanda Lopez', 'amanda.lopez@klinik.com', '$2a$10$DEF102', '1988-11-30', 'Jl. Mawar No. 22', '081234567893', 'dokter'),
(14, 'Dr. David Kim', 'david.kim@klinik.com', '$2a$10$GHI103', '1979-09-05', 'Jl. Dahlia No. 45', '081234567894', 'dokter'),
(15, 'sava', 'sava@gmail.com', '$2a$10$0aSq6OWUMoxXpmonkRSBseff5UEaTze8XvsST.Vyonfz1da/EW.6e', '2012-12-12', 'koper', '0822', 'pasien');

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
-- Indexes for table `jadwal_dokter`
--
ALTER TABLE `jadwal_dokter`
  ADD PRIMARY KEY (`idJadwal`),
  ADD KEY `dokterId` (`dokterId`);

--
-- Indexes for table `riwayat_medis`
--
ALTER TABLE `riwayat_medis`
  ADD PRIMARY KEY (`idRiwayatMedis`),
  ADD KEY `idPasien` (`idPasien`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`);

--
-- Indexes for table `transaksi`
--
ALTER TABLE `transaksi`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_transaksi_pasien` (`pasienId`),
  ADD KEY `idx_transaksi_dokter` (`dokterId`);

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
-- AUTO_INCREMENT for table `booking`
--
ALTER TABLE `booking`
  MODIFY `idBooking` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `jadwal_dokter`
--
ALTER TABLE `jadwal_dokter`
  MODIFY `idJadwal` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `riwayat_medis`
--
ALTER TABLE `riwayat_medis`
  MODIFY `idRiwayatMedis` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `transaksi`
--
ALTER TABLE `transaksi`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `idUser` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `booking`
--
ALTER TABLE `booking`
  ADD CONSTRAINT `booking_ibfk_1` FOREIGN KEY (`pasienId`) REFERENCES `user` (`idUser`),
  ADD CONSTRAINT `booking_ibfk_2` FOREIGN KEY (`jadwalId`) REFERENCES `jadwal_dokter` (`idJadwal`);

--
-- Constraints for table `jadwal_dokter`
--
ALTER TABLE `jadwal_dokter`
  ADD CONSTRAINT `jadwal_dokter_ibfk_1` FOREIGN KEY (`dokterId`) REFERENCES `user` (`idUser`);

--
-- Constraints for table `riwayat_medis`
--
ALTER TABLE `riwayat_medis`
  ADD CONSTRAINT `riwayat_medis_ibfk_1` FOREIGN KEY (`idPasien`) REFERENCES `user` (`idUser`);

--
-- Constraints for table `transaksi`
--
ALTER TABLE `transaksi`
  ADD CONSTRAINT `transaksi_ibfk_1` FOREIGN KEY (`pasienId`) REFERENCES `user` (`idUser`),
  ADD CONSTRAINT `transaksi_ibfk_2` FOREIGN KEY (`dokterId`) REFERENCES `user` (`idUser`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
