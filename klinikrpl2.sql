-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 28, 2024 at 01:38 PM
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
-- Table structure for table `jadwal`
--

CREATE TABLE `jadwal` (
  `idJadwal` int(3) NOT NULL,
  `hari` varchar(6) NOT NULL,
  `waktu` time NOT NULL,
  `idDokter` int(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `jadwal`
--

INSERT INTO `jadwal` (`idJadwal`, `hari`, `waktu`, `idDokter`) VALUES
(1, 'Senin', '08:00:00', 1),
(2, 'Selasa', '10:00:00', 2),
(3, 'Rabu', '09:00:00', 6),
(4, 'Kamis', '14:00:00', 1),
(5, 'Jumat', '11:00:00', 2);

-- --------------------------------------------------------

--
-- Table structure for table `kunjungandokter`
--

CREATE TABLE `kunjungandokter` (
  `idKunjungan` int(3) NOT NULL,
  `tanggal` date NOT NULL,
  `idPasien` int(3) NOT NULL,
  `idDokter` int(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `kunjungandokter`
--

INSERT INTO `kunjungandokter` (`idKunjungan`, `tanggal`, `idPasien`, `idDokter`) VALUES
(1, '2024-11-01', 4, 1),
(2, '2024-11-02', 4, 2),
(3, '2024-11-03', 7, 6),
(4, '2024-11-04', 4, 1),
(5, '2024-11-05', 7, 2);

-- --------------------------------------------------------

--
-- Table structure for table `riwayatmedis`
--

CREATE TABLE `riwayatmedis` (
  `idRiwayatMedis` int(3) NOT NULL,
  `idPasien` int(3) NOT NULL,
  `idPerawat` int(3) NOT NULL,
  `idDokter` int(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `riwayatmedis`
--

INSERT INTO `riwayatmedis` (`idRiwayatMedis`, `idPasien`, `idPerawat`, `idDokter`) VALUES
(1, 4, 3, 1),
(2, 7, 8, 6),
(3, 4, 3, 2),
(4, 7, 8, 2),
(5, 4, 3, 1);

-- --------------------------------------------------------

--
-- Table structure for table `transaksi`
--

CREATE TABLE `transaksi` (
  `idTransaksi` int(3) NOT NULL,
  `tanggal` date NOT NULL,
  `status` tinyint(1) NOT NULL,
  `idPasien` int(3) NOT NULL,
  `idAdministrator` int(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `transaksi`
--

INSERT INTO `transaksi` (`idTransaksi`, `tanggal`, `status`, `idPasien`, `idAdministrator`) VALUES
(1, '2024-11-01', 1, 4, 5),
(2, '2024-11-02', 0, 7, 5),
(3, '2024-11-03', 1, 4, 5),
(4, '2024-11-04', 0, 7, 5),
(5, '2024-11-05', 1, 4, 5);

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `idUser` int(3) NOT NULL,
  `namaUser` varchar(50) NOT NULL,
  `tanggalLahir` date DEFAULT NULL,
  `alamat` varchar(100) DEFAULT NULL,
  `spesialis` varchar(50) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `nomorTelepon` varchar(15) DEFAULT NULL,
  `role` enum('dokter','perawat','pasien','administrator') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`idUser`, `namaUser`, `tanggalLahir`, `alamat`, `spesialis`, `email`, `password`, `nomorTelepon`, `role`) VALUES
(1, 'Dr. Andi', '1980-05-15', 'Jl. Sudirman No. 10', 'Dokter Umum', 'dokterandi@gmail.com', 'dokterandi', '081234567890', 'dokter'),
(2, 'Dr. Siti', '1985-07-20', 'Jl. Merdeka No. 25', 'Dokter Anak', 'siti@example.com', 'hashedpassword234', '082345678901', 'dokter'),
(3, 'Perawat Budi', '1990-03-10', 'Jl. Kemerdekaan No. 5', NULL, 'budi@example.com', 'hashedpassword345', '083456789012', 'perawat'),
(4, 'Pasien Lisa', '2000-01-22', 'Jl. Harmoni No. 2', NULL, 'lisa@example.com', 'hashedpassword456', '084567890123', 'pasien'),
(5, 'Administrator Tono', '1995-06-30', 'Jl. Sejahtera No. 15', NULL, 'tono@example.com', 'hashedpassword567', '085678901234', 'administrator'),
(6, 'Dr. Maya', '1983-04-18', 'Jl. Pahlawan No. 12', 'Dokter Gigi', 'maya@example.com', 'hashedpassword678', '086789012345', 'dokter'),
(7, 'Pasien Rian', '1998-09-11', 'Jl. Kartini No. 8', NULL, 'rian@example.com', 'hashedpassword789', '087890123456', 'pasien'),
(8, 'Perawat Sari', '1992-11-15', 'Jl. Mangga No. 22', NULL, 'sari@example.com', 'hashedpassword890', '088901234567', 'perawat'),
(9, 'bagas', NULL, NULL, NULL, 'maulanabagasfadhila@gmail.com', '$2a$10$6dUnaxNOKdo4YpKAMVx10.FU/toKovlQLvnuEEtmyaeYoY8cjwlNO', NULL, 'pasien'),
(10, 'bagas', NULL, NULL, NULL, 'maulanabagasfadhila@gmail.com', '$2a$10$K1TMPnkoB7jxfh7MR4RTUuCP.HdUqHcz8DvrXchgm8CE8brIXE.g.', NULL, 'pasien'),
(11, 'bagas', NULL, NULL, NULL, 'maulanabagasfadhila@gmail.com', '$2a$10$Eb/c8Xgimz6vEYJZU/PydeFuEZIVN1U76QASk6cCDMHtEBcZi88Ay', NULL, 'pasien');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `jadwal`
--
ALTER TABLE `jadwal`
  ADD PRIMARY KEY (`idJadwal`),
  ADD KEY `Jadwal_fkKeDokter` (`idDokter`);

--
-- Indexes for table `kunjungandokter`
--
ALTER TABLE `kunjungandokter`
  ADD PRIMARY KEY (`idKunjungan`),
  ADD KEY `KunjunganDokter_fkKeDokter` (`idDokter`),
  ADD KEY `KunjunganDokter_fkKePasien` (`idPasien`);

--
-- Indexes for table `riwayatmedis`
--
ALTER TABLE `riwayatmedis`
  ADD PRIMARY KEY (`idRiwayatMedis`),
  ADD KEY `RiwayatMedis_fkKePasien` (`idPasien`),
  ADD KEY `RiwayatMedis_fkKePerawat` (`idPerawat`),
  ADD KEY `RiwayatMedis_fkKeDokter` (`idDokter`);

--
-- Indexes for table `transaksi`
--
ALTER TABLE `transaksi`
  ADD PRIMARY KEY (`idTransaksi`),
  ADD KEY `Transaksi_fkKeAdministrator` (`idAdministrator`),
  ADD KEY `Transaksi_fkKePasien` (`idPasien`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`idUser`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `jadwal`
--
ALTER TABLE `jadwal`
  MODIFY `idJadwal` int(3) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `kunjungandokter`
--
ALTER TABLE `kunjungandokter`
  MODIFY `idKunjungan` int(3) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `riwayatmedis`
--
ALTER TABLE `riwayatmedis`
  MODIFY `idRiwayatMedis` int(3) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `transaksi`
--
ALTER TABLE `transaksi`
  MODIFY `idTransaksi` int(3) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `idUser` int(3) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `kunjungandokter`
--
ALTER TABLE `kunjungandokter`
  ADD CONSTRAINT `KunjunganDokter_fkKeDokter` FOREIGN KEY (`idDokter`) REFERENCES `user` (`idUser`),
  ADD CONSTRAINT `KunjunganDokter_fkKePasien` FOREIGN KEY (`idPasien`) REFERENCES `user` (`idUser`);

--
-- Constraints for table `riwayatmedis`
--
ALTER TABLE `riwayatmedis`
  ADD CONSTRAINT `RiwayatMedis_fkKeDokter` FOREIGN KEY (`idDokter`) REFERENCES `user` (`idUser`),
  ADD CONSTRAINT `RiwayatMedis_fkKePasien` FOREIGN KEY (`idPasien`) REFERENCES `user` (`idUser`),
  ADD CONSTRAINT `RiwayatMedis_fkKePerawat` FOREIGN KEY (`idPerawat`) REFERENCES `user` (`idUser`);

--
-- Constraints for table `transaksi`
--
ALTER TABLE `transaksi`
  ADD CONSTRAINT `Transaksi_fkKeAdministrator` FOREIGN KEY (`idAdministrator`) REFERENCES `user` (`idUser`),
  ADD CONSTRAINT `Transaksi_fkKePasien` FOREIGN KEY (`idPasien`) REFERENCES `user` (`idUser`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
