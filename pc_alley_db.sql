-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 26, 2026 at 02:04 AM
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
-- Database: `pc_alley_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `attendances`
--

CREATE TABLE `attendances` (
  `id` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `branchId` int(11) DEFAULT NULL,
  `clockInTime` datetime NOT NULL,
  `clockOutTime` datetime DEFAULT NULL,
  `status` enum('Present','Late','Absent') DEFAULT 'Present',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `branches`
--

CREATE TABLE `branches` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `branches`
--

INSERT INTO `branches` (`id`, `name`, `location`, `phone`, `createdAt`, `updatedAt`) VALUES
(1, 'Sta Rosa', 'Sta Rosa, Laguna', '049-123-4567', '2026-04-15 12:44:29', '2026-04-15 12:44:29'),
(2, 'Calamba', 'Calamba, Laguna', '049-234-5678', '2026-04-15 12:44:29', '2026-04-15 12:44:29'),
(3, 'Sta Cruz', 'Sta Cruz, Laguna', '049-345-6789', '2026-04-15 12:44:29', '2026-04-15 12:44:29');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `createdAt`, `updatedAt`) VALUES
(1, 'PC Components', '2026-04-15 12:44:29', '2026-04-15 12:44:29'),
(2, 'Peripherals', '2026-04-15 12:44:29', '2026-04-15 12:44:29'),
(3, 'Laptops', '2026-04-15 12:44:29', '2026-04-15 12:44:29'),
(4, 'Accessories', '2026-04-15 12:44:29', '2026-04-15 12:44:29'),
(5, 'GPU', '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(6, 'CPU', '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(7, 'Motherboard', '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(8, 'RAM', '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(9, 'Storage', '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(10, 'Power Supply', '2026-04-17 09:50:49', '2026-04-17 09:50:49');

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `branchId` int(11) DEFAULT NULL,
  `totalSpent` decimal(12,2) DEFAULT 0.00,
  `totalOrders` int(11) DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `name`, `email`, `phone`, `address`, `branchId`, `totalSpent`, `totalOrders`, `createdAt`, `updatedAt`) VALUES
('1dc7a244-c7b7-4dad-8fe8-d243d5df95fa', 'Atong Ang', 'bob@example.com', '0918-765-4321', '', 2, 0.00, 0, '2026-04-11 11:15:05', '2026-04-11 18:39:40'),
('5f808b46-3508-48ed-8481-ee78ea351e52', 'Alice Guo', 'alice@example.com', '0917-123-4567', NULL, 2, 0.00, 0, '2026-04-11 11:15:05', '2026-04-11 11:15:05'),
('da645698-46fc-469b-97dc-02fa7cdf9615', 'Charlie Dizon', 'charlie@example.com', '0919-000-1111', NULL, 632, 0.00, 0, '2026-04-11 11:15:05', '2026-04-11 11:15:05');

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `id` int(11) NOT NULL,
  `branchId` int(11) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `category` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `notes` text DEFAULT NULL,
  `receiptUrl` varchar(255) DEFAULT NULL,
  `expenseDate` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventories`
--

CREATE TABLE `inventories` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `quantity` int(11) DEFAULT 0,
  `low_stock_threshold` int(11) DEFAULT 5,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inventories`
--

INSERT INTO `inventories` (`id`, `product_id`, `branch_id`, `quantity`, `low_stock_threshold`, `createdAt`, `updatedAt`) VALUES
(1, 1, 1, 100, 5, '2026-04-17 09:50:49', '2026-04-24 16:56:57'),
(2, 2, 1, 50, 5, '2026-04-17 09:50:49', '2026-04-24 20:12:45'),
(3, 3, 1, 21, 5, '2026-04-17 09:50:49', '2026-04-24 17:24:23'),
(4, 4, 1, 39, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(5, 5, 1, 54, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(6, 6, 1, 7, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(7, 7, 1, 49, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(8, 8, 1, 42, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(9, 9, 1, 32, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(10, 10, 1, 24, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(11, 11, 1, 7, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(12, 12, 1, 6, 5, '2026-04-17 09:50:49', '2026-04-24 17:12:25'),
(13, 13, 1, 41, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(14, 14, 1, 18, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(15, 1, 2, 45, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(16, 2, 2, 50, 5, '2026-04-17 09:50:49', '2026-04-24 20:12:45'),
(17, 3, 2, 11, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(18, 4, 2, 28, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(19, 5, 2, 46, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(20, 6, 2, 16, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(21, 7, 2, 9, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(22, 8, 2, 40, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(23, 9, 2, 35, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(24, 10, 2, 49, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(25, 11, 2, 54, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(26, 12, 2, 32, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(27, 13, 2, 7, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(28, 14, 2, 27, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(29, 1, 3, 28, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(30, 2, 3, 50, 5, '2026-04-17 09:50:49', '2026-04-24 20:12:45'),
(31, 3, 3, 25, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(32, 4, 3, 33, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(33, 5, 3, 13, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(34, 6, 3, 46, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(35, 7, 3, 30, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(36, 8, 3, 9, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(37, 9, 3, 48, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(38, 10, 3, 47, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(39, 11, 3, 8, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(40, 12, 3, 14, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(41, 13, 3, 21, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49'),
(42, 14, 3, 36, 5, '2026-04-17 09:50:49', '2026-04-17 09:50:49');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` varchar(255) DEFAULT 'info',
  `link` varchar(255) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `link`, `is_read`, `createdAt`, `updatedAt`) VALUES
(1, 1, 'New Restock Request', 'starosa_admin@pcalley.com (Manager) has requested 1 units of Intel Core i7-14700K for Sta Rosa.', 'restock_request', '/admin?tab=restock&id=1', 1, '2026-04-24 17:31:31', '2026-04-24 17:32:11'),
(2, 9, 'New Restock Request', 'starosa_admin@pcalley.com (Manager) has requested 1 units of Intel Core i7-14700K for Sta Rosa.', 'restock_request', '/admin?tab=restock&id=1', 1, '2026-04-24 17:31:31', '2026-04-25 20:34:08'),
(3, 1, 'New Restock Request', 'calamba_admin@pcalley.com (Manager) has requested 1 units of ASUS ROG Maximus Z790 Hero for Calamba.', 'restock_request', '/admin?tab=restock&id=2', 1, '2026-04-25 15:14:22', '2026-04-25 15:33:04'),
(4, 9, 'New Restock Request', 'calamba_admin@pcalley.com (Manager) has requested 1 units of ASUS ROG Maximus Z790 Hero for Calamba.', 'restock_request', '/admin?tab=restock&id=2', 1, '2026-04-25 15:14:22', '2026-04-25 20:34:08');

-- --------------------------------------------------------

--
-- Table structure for table `orderitems`
--

CREATE TABLE `orderitems` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price_at_sale` decimal(10,2) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orderitems`
--

INSERT INTO `orderitems` (`id`, `order_id`, `product_id`, `quantity`, `price_at_sale`, `createdAt`, `updatedAt`) VALUES
(1, 1, 8, 1, 32500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(2, 2, 13, 2, 11200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(3, 2, 7, 1, 42800.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(4, 2, 5, 1, 45200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(5, 3, 13, 1, 11200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(6, 3, 2, 2, 68500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(7, 4, 3, 2, 62400.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(8, 4, 3, 2, 62400.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(9, 4, 2, 2, 68500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(10, 5, 5, 1, 45200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(11, 5, 7, 2, 42800.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(12, 5, 3, 1, 62400.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(13, 6, 10, 2, 9800.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(14, 7, 14, 2, 8400.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(15, 7, 7, 1, 42800.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(16, 7, 1, 1, 112000.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(17, 8, 13, 1, 11200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(18, 9, 10, 1, 9800.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(19, 9, 5, 2, 45200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(20, 10, 10, 1, 9800.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(21, 11, 2, 1, 68500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(22, 11, 8, 2, 32500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(23, 11, 5, 2, 45200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(24, 12, 5, 2, 45200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(25, 12, 2, 1, 68500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(26, 12, 1, 1, 112000.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(27, 13, 13, 1, 11200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(28, 13, 11, 2, 14800.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(29, 14, 4, 2, 38200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(30, 14, 1, 1, 112000.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(31, 15, 6, 1, 26500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(32, 16, 2, 1, 68500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(33, 16, 4, 2, 38200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(34, 16, 1, 2, 112000.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(35, 17, 3, 2, 62400.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(36, 18, 10, 1, 9800.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(37, 19, 12, 1, 10500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(38, 19, 14, 2, 8400.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(39, 19, 14, 2, 8400.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(40, 20, 2, 1, 68500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(41, 20, 7, 2, 42800.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(42, 20, 1, 1, 112000.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(43, 21, 11, 1, 14800.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(44, 21, 9, 1, 12500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(45, 22, 2, 2, 68500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(46, 22, 2, 2, 68500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(47, 23, 8, 1, 32500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(48, 23, 4, 2, 38200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(49, 24, 10, 1, 9800.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(50, 25, 5, 1, 45200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(51, 25, 1, 2, 112000.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(52, 26, 7, 2, 42800.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(53, 27, 3, 1, 62400.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(54, 27, 9, 2, 12500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(55, 27, 5, 2, 45200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(56, 28, 11, 2, 14800.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(57, 28, 8, 2, 32500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(58, 29, 6, 1, 26500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(59, 29, 14, 1, 8400.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(60, 29, 6, 1, 26500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(61, 30, 9, 1, 12500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(62, 31, 7, 1, 42800.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(63, 31, 2, 2, 68500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(64, 32, 4, 1, 38200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(65, 32, 1, 1, 112000.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(66, 33, 5, 2, 45200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(67, 33, 9, 2, 12500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(68, 33, 10, 1, 9800.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(69, 34, 4, 2, 38200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(70, 34, 7, 2, 42800.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(71, 34, 5, 2, 45200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(72, 35, 7, 2, 42800.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(73, 36, 3, 2, 62400.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(74, 36, 14, 1, 8400.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(75, 36, 6, 2, 26500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(76, 37, 14, 2, 8400.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(77, 38, 5, 2, 45200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(78, 38, 3, 1, 62400.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(79, 38, 6, 1, 26500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(80, 39, 11, 1, 14800.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(81, 39, 13, 2, 11200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(82, 39, 2, 2, 68500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(83, 40, 5, 1, 45200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(84, 41, 4, 2, 38200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(85, 41, 1, 1, 112000.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(86, 42, 2, 1, 68500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(87, 42, 13, 1, 11200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(88, 42, 9, 2, 12500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(89, 43, 14, 1, 8400.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(90, 43, 2, 1, 68500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(91, 43, 8, 2, 32500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(92, 44, 11, 1, 14800.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(93, 44, 2, 2, 68500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(94, 44, 4, 1, 38200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(95, 45, 12, 1, 10500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(96, 45, 5, 2, 45200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(97, 46, 13, 2, 11200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(98, 47, 12, 2, 10500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(99, 47, 9, 2, 12500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(100, 48, 12, 2, 10500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(101, 48, 5, 2, 45200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(102, 49, 13, 1, 11200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(103, 49, 4, 1, 38200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(104, 49, 5, 2, 45200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(105, 50, 1, 1, 112000.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(106, 51, 1, 2, 112000.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(107, 51, 1, 2, 112000.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(108, 52, 9, 2, 12500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(109, 52, 3, 1, 62400.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(110, 53, 5, 2, 45200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(111, 54, 10, 1, 9800.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(112, 54, 11, 2, 14800.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(113, 54, 4, 1, 38200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(114, 55, 6, 1, 26500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(115, 55, 1, 1, 112000.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(116, 56, 14, 2, 8400.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(117, 56, 5, 1, 45200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(118, 57, 13, 1, 11200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(119, 57, 14, 2, 8400.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(120, 58, 3, 2, 62400.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(121, 59, 5, 1, 45200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(122, 60, 12, 2, 10500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(123, 61, 2, 2, 68500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(124, 61, 11, 1, 14800.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(125, 62, 13, 1, 11200.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(126, 63, 1, 1, 112000.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(127, 63, 8, 2, 32500.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44'),
(128, 64, 10, 2, 9800.00, '2026-04-17 09:51:44', '2026-04-17 09:51:44');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(255) DEFAULT NULL,
  `status` enum('pending','completed','cancelled') DEFAULT 'completed',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `proof_of_payment_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `branch_id`, `user_id`, `customer_name`, `total_amount`, `payment_method`, `status`, `createdAt`, `updatedAt`, `proof_of_payment_url`) VALUES
(1, 1, 1, 'Maria Santos', 32500.00, 'card', 'completed', '2026-01-24 16:00:00', '2026-04-17 09:51:44', NULL),
(2, 3, 1, 'Maria Santos', 110400.00, 'card', 'completed', '2026-01-16 16:00:00', '2026-04-17 09:51:44', NULL),
(3, 1, 1, 'John Doe', 148200.00, 'card', 'completed', '2026-01-06 16:00:00', '2026-04-17 09:51:44', NULL),
(4, 2, 1, 'John Doe', 386600.00, 'card', 'completed', '2026-01-19 16:00:00', '2026-04-17 09:51:44', NULL),
(5, 3, 1, 'Ana Cruz', 193200.00, 'card', 'completed', '2026-02-05 16:00:00', '2026-04-17 09:51:44', NULL),
(6, 3, 1, 'Jane Smith', 19600.00, 'card', 'completed', '2026-02-04 16:00:00', '2026-04-17 09:51:44', NULL),
(7, 1, 1, 'NextGen Corp', 171600.00, 'card', 'completed', '2026-02-26 16:00:00', '2026-04-17 09:51:44', NULL),
(8, 2, 1, 'Maria Santos', 11200.00, 'card', 'completed', '2026-02-05 16:00:00', '2026-04-17 09:51:44', NULL),
(9, 3, 1, 'John Doe', 100200.00, 'card', 'completed', '2026-02-14 16:00:00', '2026-04-17 09:51:44', NULL),
(10, 3, 1, 'Jane Smith', 9800.00, 'card', 'completed', '2026-02-24 16:00:00', '2026-04-17 09:51:44', NULL),
(11, 3, 1, 'Ana Cruz', 223900.00, 'card', 'completed', '2026-02-18 16:00:00', '2026-04-17 09:51:44', NULL),
(12, 1, 1, 'NextGen Corp', 270900.00, 'card', 'completed', '2026-03-16 16:00:00', '2026-04-17 09:51:44', NULL),
(13, 3, 1, 'Ana Cruz', 40800.00, 'card', 'completed', '2026-03-17 16:00:00', '2026-04-17 09:51:44', NULL),
(14, 3, 1, 'Jane Smith', 188400.00, 'card', 'completed', '2026-03-02 16:00:00', '2026-04-17 09:51:44', NULL),
(15, 1, 1, 'Tech Solutions Inc.', 26500.00, 'card', 'completed', '2026-03-03 16:00:00', '2026-04-17 09:51:44', NULL),
(16, 1, 1, 'NextGen Corp', 368900.00, 'card', 'completed', '2026-03-03 16:00:00', '2026-04-17 09:51:44', NULL),
(17, 1, 1, 'John Doe', 124800.00, 'card', 'completed', '2026-03-15 16:00:00', '2026-04-17 09:51:44', NULL),
(18, 2, 1, 'NextGen Corp', 9800.00, 'card', 'completed', '2026-03-13 16:00:00', '2026-04-17 09:51:44', NULL),
(19, 3, 1, 'Ana Cruz', 44100.00, 'card', 'completed', '2026-04-18 16:00:00', '2026-04-17 09:51:44', NULL),
(20, 1, 1, 'Alex Johnson', 266100.00, 'card', 'completed', '2026-04-11 16:00:00', '2026-04-17 09:51:44', NULL),
(21, 2, 1, 'Tech Solutions Inc.', 27300.00, 'card', 'completed', '2026-04-24 16:00:00', '2026-04-17 09:51:44', NULL),
(22, 2, 1, 'John Doe', 274000.00, 'card', 'completed', '2026-04-27 16:00:00', '2026-04-17 09:51:44', NULL),
(23, 2, 1, 'Tech Solutions Inc.', 108900.00, 'card', 'completed', '2026-04-11 16:00:00', '2026-04-17 09:51:44', NULL),
(24, 1, 1, 'Tech Solutions Inc.', 9800.00, 'card', 'completed', '2026-05-23 16:00:00', '2026-04-17 09:51:44', NULL),
(25, 3, 1, 'Tech Solutions Inc.', 269200.00, 'card', 'completed', '2026-05-06 16:00:00', '2026-04-17 09:51:44', NULL),
(26, 3, 1, 'John Doe', 85600.00, 'card', 'completed', '2026-05-09 16:00:00', '2026-04-17 09:51:44', NULL),
(27, 1, 1, 'Ana Cruz', 177800.00, 'card', 'completed', '2026-05-13 16:00:00', '2026-04-17 09:51:44', NULL),
(28, 2, 1, 'Ana Cruz', 94600.00, 'card', 'completed', '2026-05-15 16:00:00', '2026-04-17 09:51:44', NULL),
(29, 2, 1, 'Alex Johnson', 61400.00, 'card', 'completed', '2026-05-24 16:00:00', '2026-04-17 09:51:44', NULL),
(30, 3, 1, 'Jose Reyes', 12500.00, 'card', 'completed', '2026-06-25 16:00:00', '2026-04-17 09:51:44', NULL),
(31, 1, 1, 'NextGen Corp', 179800.00, 'card', 'completed', '2026-06-15 16:00:00', '2026-04-17 09:51:44', NULL),
(32, 1, 1, 'Alex Johnson', 150200.00, 'card', 'completed', '2026-06-13 16:00:00', '2026-04-17 09:51:44', NULL),
(33, 1, 1, 'Jane Smith', 125200.00, 'card', 'completed', '2026-06-16 16:00:00', '2026-04-17 09:51:44', NULL),
(34, 1, 1, 'Alex Johnson', 252400.00, 'card', 'completed', '2026-06-27 16:00:00', '2026-04-17 09:51:44', NULL),
(35, 1, 1, 'Alex Johnson', 85600.00, 'card', 'completed', '2026-07-22 16:00:00', '2026-04-17 09:51:44', NULL),
(36, 3, 1, 'Tech Solutions Inc.', 186200.00, 'card', 'completed', '2026-07-09 16:00:00', '2026-04-17 09:51:44', NULL),
(37, 2, 1, 'Jane Smith', 16800.00, 'card', 'completed', '2026-07-05 16:00:00', '2026-04-17 09:51:44', NULL),
(38, 3, 1, 'Tech Solutions Inc.', 179300.00, 'card', 'completed', '2026-07-17 16:00:00', '2026-04-17 09:51:44', NULL),
(39, 2, 1, 'Tech Solutions Inc.', 174200.00, 'card', 'completed', '2026-06-30 16:00:00', '2026-04-17 09:51:44', NULL),
(40, 1, 1, 'NextGen Corp', 45200.00, 'card', 'completed', '2026-07-25 16:00:00', '2026-04-17 09:51:44', NULL),
(41, 1, 1, 'Ana Cruz', 188400.00, 'card', 'completed', '2026-08-19 16:00:00', '2026-04-17 09:51:44', NULL),
(42, 2, 1, 'Jane Smith', 104700.00, 'card', 'completed', '2026-08-18 16:00:00', '2026-04-17 09:51:44', NULL),
(43, 2, 1, 'Alex Johnson', 141900.00, 'card', 'completed', '2026-08-06 16:00:00', '2026-04-17 09:51:44', NULL),
(44, 3, 1, 'Alex Johnson', 190000.00, 'card', 'completed', '2026-07-31 16:00:00', '2026-04-17 09:51:44', NULL),
(45, 2, 1, 'Tech Solutions Inc.', 100900.00, 'card', 'completed', '2026-08-03 16:00:00', '2026-04-17 09:51:44', NULL),
(46, 3, 1, 'Jane Smith', 22400.00, 'card', 'completed', '2026-09-06 16:00:00', '2026-04-17 09:51:44', NULL),
(47, 1, 1, 'John Doe', 46000.00, 'card', 'completed', '2026-09-25 16:00:00', '2026-04-17 09:51:44', NULL),
(48, 3, 1, 'Alex Johnson', 111400.00, 'card', 'completed', '2026-09-19 16:00:00', '2026-04-17 09:51:44', NULL),
(49, 2, 1, 'Ana Cruz', 139800.00, 'card', 'completed', '2026-09-06 16:00:00', '2026-04-17 09:51:44', NULL),
(50, 3, 1, 'Alex Johnson', 112000.00, 'card', 'completed', '2026-10-19 16:00:00', '2026-04-17 09:51:44', NULL),
(51, 1, 1, 'Jose Reyes', 448000.00, 'card', 'completed', '2026-10-13 16:00:00', '2026-04-17 09:51:44', NULL),
(52, 1, 1, 'NextGen Corp', 87400.00, 'card', 'completed', '2026-10-08 16:00:00', '2026-04-17 09:51:44', NULL),
(53, 1, 1, 'Jose Reyes', 90400.00, 'card', 'completed', '2026-09-30 16:00:00', '2026-04-17 09:51:44', NULL),
(54, 1, 1, 'John Doe', 77600.00, 'card', 'completed', '2026-10-14 16:00:00', '2026-04-17 09:51:44', NULL),
(55, 3, 1, 'John Doe', 138500.00, 'card', 'completed', '2026-10-09 16:00:00', '2026-04-17 09:51:44', NULL),
(56, 3, 1, 'John Doe', 62000.00, 'card', 'completed', '2026-11-10 16:00:00', '2026-04-17 09:51:44', NULL),
(57, 1, 1, 'Tech Solutions Inc.', 28000.00, 'card', 'completed', '2026-11-15 16:00:00', '2026-04-17 09:51:44', NULL),
(58, 3, 1, 'Alex Johnson', 124800.00, 'card', 'completed', '2026-11-22 16:00:00', '2026-04-17 09:51:44', NULL),
(59, 2, 1, 'John Doe', 45200.00, 'card', 'completed', '2026-11-03 16:00:00', '2026-04-17 09:51:44', NULL),
(60, 2, 1, 'Jane Smith', 21000.00, 'card', 'completed', '2026-10-31 16:00:00', '2026-04-17 09:51:44', NULL),
(61, 1, 1, 'Ana Cruz', 151800.00, 'card', 'completed', '2026-11-17 16:00:00', '2026-04-17 09:51:44', NULL),
(62, 3, 1, 'Maria Santos', 11200.00, 'card', 'completed', '2026-12-22 16:00:00', '2026-04-17 09:51:44', NULL),
(63, 2, 1, 'Ana Cruz', 177000.00, 'card', 'completed', '2026-11-30 16:00:00', '2026-04-17 09:51:44', NULL),
(64, 1, 1, 'Jose Reyes', 19600.00, 'card', 'completed', '2026-12-05 16:00:00', '2026-04-17 09:51:44', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `payrolls`
--

CREATE TABLE `payrolls` (
  `id` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `periodStart` date NOT NULL,
  `periodEnd` date NOT NULL,
  `baseSalary` decimal(10,2) NOT NULL,
  `allowances` decimal(10,2) DEFAULT 0.00,
  `deductions` decimal(10,2) DEFAULT 0.00,
  `netSalary` decimal(10,2) NOT NULL,
  `status` enum('Draft','Paid') DEFAULT 'Draft',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `productbundles`
--

CREATE TABLE `productbundles` (
  `bundle_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `sku` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `last_purchase_price` decimal(10,2) DEFAULT NULL,
  `is_bundle` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `name`, `sku`, `description`, `category_id`, `price`, `image_url`, `createdAt`, `updatedAt`, `supplier_id`, `last_purchase_price`, `is_bundle`) VALUES
(1, 'NVIDIA RTX 4090 OC', 'GPU-NV-4090', NULL, 5, 112000.00, NULL, '2026-04-17 09:50:49', '2026-04-17 09:50:49', NULL, NULL, 0),
(2, 'NVIDIA RTX 4080 Super', 'GPU-NV-4080S', NULL, 5, 68500.00, NULL, '2026-04-17 09:50:49', '2026-04-17 09:50:49', NULL, NULL, 0),
(3, 'AMD Radeon RX 7900 XTX', 'GPU-AMD-7900XTX', NULL, 5, 62400.00, NULL, '2026-04-17 09:50:49', '2026-04-17 09:50:49', NULL, NULL, 0),
(4, 'Intel Core i9-14900K', 'CPU-INT-14900K', NULL, 6, 38200.00, NULL, '2026-04-17 09:50:49', '2026-04-17 09:50:49', NULL, NULL, 0),
(5, 'AMD Ryzen 9 7950X3D', 'CPU-AMD-7950X3D', NULL, 6, 45200.00, NULL, '2026-04-17 09:50:49', '2026-04-17 09:50:49', NULL, NULL, 0),
(6, 'Intel Core i7-14700K', 'CPU-INT-14700K', NULL, 6, 26500.00, NULL, '2026-04-17 09:50:49', '2026-04-17 09:50:49', NULL, NULL, 0),
(7, 'ASUS ROG Maximus Z790 Hero', 'MB-AS-Z790H', NULL, 7, 42800.00, NULL, '2026-04-17 09:50:49', '2026-04-17 09:50:49', NULL, NULL, 0),
(8, 'MSI MPG X670E Carbon WiFi', 'MB-MSI-X670EC', NULL, 7, 32500.00, NULL, '2026-04-17 09:50:49', '2026-04-17 09:50:49', NULL, NULL, 0),
(9, 'G.Skill Trident Z5 RGB 32GB DDR5-6000', 'RAM-GS-32D5', NULL, 8, 12500.00, NULL, '2026-04-17 09:50:49', '2026-04-17 09:50:49', NULL, NULL, 0),
(10, 'Corsair Vengeance RGB 32GB DDR5-5200', 'RAM-CR-32D5', NULL, 8, 9800.00, NULL, '2026-04-17 09:50:49', '2026-04-17 09:50:49', NULL, NULL, 0),
(11, 'Samsung 990 Pro 2TB NVMe', 'SSD-SS-990P2', NULL, 9, 14800.00, NULL, '2026-04-17 09:50:49', '2026-04-17 09:50:49', NULL, NULL, 0),
(12, 'Western Digital Black SN850X 2TB', 'SSD-WD-SN850X', NULL, 9, 10500.00, NULL, '2026-04-17 09:50:49', '2026-04-17 09:50:49', NULL, NULL, 0),
(13, 'Corsair RM1000x 1000W Gold', 'PSU-CR-RM1000X', NULL, 10, 11200.00, NULL, '2026-04-17 09:50:49', '2026-04-17 09:50:49', NULL, NULL, 0),
(14, 'Seasonic Focus GX-850 850W Gold', 'PSU-SS-GX850', NULL, 10, 8400.00, NULL, '2026-04-17 09:50:49', '2026-04-17 09:50:49', NULL, NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `purchaseorderitems`
--

CREATE TABLE `purchaseorderitems` (
  `id` int(11) NOT NULL,
  `poId` int(11) NOT NULL,
  `productId` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unitCost` decimal(12,2) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchaseorders`
--

CREATE TABLE `purchaseorders` (
  `id` int(11) NOT NULL,
  `poNumber` varchar(255) NOT NULL,
  `supplierId` int(11) NOT NULL,
  `branchId` int(11) NOT NULL,
  `status` enum('Ordered','Pending','Received') DEFAULT 'Ordered',
  `totalAmount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `dueAmount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `restockrequests`
--

CREATE TABLE `restockrequests` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `manager_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `cost_price` decimal(10,2) DEFAULT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('Pending','Approved','Rejected') DEFAULT 'Pending',
  `admin_id` int(11) DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `restockrequests`
--

INSERT INTO `restockrequests` (`id`, `product_id`, `branch_id`, `manager_id`, `quantity`, `cost_price`, `supplier_id`, `notes`, `status`, `admin_id`, `rejection_reason`, `createdAt`, `updatedAt`) VALUES
(1, 6, 1, 2, 1, NULL, NULL, '', 'Pending', NULL, NULL, '2026-04-24 17:31:31', '2026-04-24 17:31:31'),
(2, 7, 2, 3, 1, NULL, NULL, '', 'Pending', NULL, NULL, '2026-04-25 15:14:22', '2026-04-25 15:14:22');

-- --------------------------------------------------------

--
-- Table structure for table `saleitems`
--

CREATE TABLE `saleitems` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `saleId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `productId` int(11) DEFAULT NULL,
  `productName` varchar(255) NOT NULL,
  `productSku` varchar(255) DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unitPrice` decimal(12,2) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales`
--

CREATE TABLE `sales` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `invoiceNumber` varchar(255) NOT NULL,
  `customerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `customerName` varchar(255) DEFAULT 'Walk-in Customer',
  `branchId` int(11) NOT NULL,
  `staffId` int(11) NOT NULL,
  `staffName` varchar(255) DEFAULT NULL,
  `totalAmount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `paymentMethod` enum('cash','card','gcash','bank_transfer','mixed') DEFAULT 'cash',
  `status` enum('completed','voided','refunded','draft','quotation') DEFAULT 'completed',
  `notes` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stockmovements`
--

CREATE TABLE `stockmovements` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `type` enum('RESTOCK','SALE','ADJUSTMENT') NOT NULL,
  `quantity` int(11) NOT NULL,
  `previous_stock` int(11) NOT NULL,
  `new_stock` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stockmovements`
--

INSERT INTO `stockmovements` (`id`, `product_id`, `type`, `quantity`, `previous_stock`, `new_stock`, `user_id`, `supplier_id`, `note`, `createdAt`, `updatedAt`) VALUES
(3, 2, 'RESTOCK', 30, 30, 60, 2, NULL, 'Procurement processed', '2026-04-24 06:34:03', '2026-04-24 06:34:03'),
(4, 2, 'RESTOCK', 60, 60, 120, 2, NULL, 'Procurement processed', '2026-04-24 06:35:45', '2026-04-24 06:35:45'),
(5, 2, 'RESTOCK', 2147483647, 120, 2147483647, 2, NULL, 'Procurement processed', '2026-04-24 06:36:10', '2026-04-24 06:36:10'),
(6, 1, 'RESTOCK', 30, 66, 96, 1, NULL, 'Procurement processed', '2026-04-24 16:46:26', '2026-04-24 16:46:26'),
(7, 1, 'RESTOCK', 4, 96, 100, 1, NULL, 'Procurement processed', '2026-04-24 16:56:57', '2026-04-24 16:56:57'),
(8, 12, 'RESTOCK', 1, 5, 6, 2, NULL, 'Procurement processed', '2026-04-24 17:12:25', '2026-04-24 17:12:25'),
(9, 3, 'RESTOCK', 1, 20, 21, 1, NULL, 'Procurement processed', '2026-04-24 17:24:23', '2026-04-24 17:24:23');

-- --------------------------------------------------------

--
-- Table structure for table `stocktransferitems`
--

CREATE TABLE `stocktransferitems` (
  `id` int(11) NOT NULL,
  `transferId` int(11) NOT NULL,
  `productId` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stocktransfers`
--

CREATE TABLE `stocktransfers` (
  `id` int(11) NOT NULL,
  `fromBranchId` int(11) NOT NULL,
  `toBranchId` int(11) NOT NULL,
  `status` enum('Pending','In-Transit','Completed') DEFAULT 'Pending',
  `notes` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('super_admin','branch_admin','employee') DEFAULT 'employee',
  `branch_id` int(11) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `role`, `branch_id`, `createdAt`, `updatedAt`) VALUES
(1, 'admin@pcalley.com', '$2a$10$wdLA37fS7dy.a.TmGtw9UOCy7qbVbbqWFpck4l3dUIOeS6XZtFOl6', 'super_admin', NULL, '2026-04-15 12:44:29', '2026-04-20 16:56:44'),
(2, 'starosa_admin@pcalley.com', '$2a$10$ZYc6hPG3WZ9SMdCX6NxVQ.r.UgIysDLl62q6/5U8NTAEB852hsRJ6', 'branch_admin', 1, '2026-04-15 12:44:29', '2026-04-15 12:44:29'),
(3, 'calamba_admin@pcalley.com', '$2a$10$ZYc6hPG3WZ9SMdCX6NxVQ.r.UgIysDLl62q6/5U8NTAEB852hsRJ6', 'branch_admin', 2, '2026-04-15 12:44:29', '2026-04-15 12:44:29'),
(4, 'stacruz_admin@pcalley.com', '$2a$10$Rq2wo8QRUmsHUf.gGD7t5eEZ.4uAdXWPujdPhqMyQp/rxHDzEnh9a', 'branch_admin', 3, '2026-04-15 12:44:29', '2026-04-16 01:50:33'),
(5, 'starosa_staff@pcalley.com', '$2a$10$axLwe1hp6BfZIQkN.VSmqut3V702zbAvxabWSZyzdDRKQfjF2PIbK', 'employee', 1, '2026-04-15 12:44:29', '2026-04-15 12:44:29'),
(9, 'superadmin_demo@pcalley.com', '$2a$10$liXmhlzRedrhw7K6uIUWpeYQ9x66YxPHXLJhZ.dzfhG6cNiQXIvl2', 'super_admin', NULL, '2026-04-15 22:36:30', '2026-04-15 22:36:30'),
(10, 'manager_sta_cruz@branch', '$2a$10$sE/B6QlFHgFXFyiobIqGCexKjuK3GGmZaROR6w823Lg3iklu0rP..', 'branch_admin', 3, '2026-04-15 22:36:30', '2026-04-15 22:36:30'),
(11, 'staff_sta_cruz@branch', '$2a$10$retl4.wZhIIFLX6GpaaEFOs2luCwnfErtwIvf0g2rzXEY57stGYly', 'employee', 3, '2026-04-15 22:36:30', '2026-04-15 22:36:30');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `attendances`
--
ALTER TABLE `attendances`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `branches`
--
ALTER TABLE `branches`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD UNIQUE KEY `name_2` (`name`),
  ADD UNIQUE KEY `name_3` (`name`),
  ADD UNIQUE KEY `name_4` (`name`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `inventories`
--
ALTER TABLE `inventories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `inventories_product_id_branch_id` (`product_id`,`branch_id`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `orderitems`
--
ALTER TABLE `orderitems`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `payrolls`
--
ALTER TABLE `payrolls`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `productbundles`
--
ALTER TABLE `productbundles`
  ADD PRIMARY KEY (`bundle_id`,`product_id`),
  ADD UNIQUE KEY `product_bundles_bundle_id_product_id` (`bundle_id`,`product_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sku` (`sku`),
  ADD UNIQUE KEY `sku_2` (`sku`),
  ADD UNIQUE KEY `sku_3` (`sku`),
  ADD UNIQUE KEY `sku_4` (`sku`),
  ADD KEY `category_id` (`category_id`),
  ADD KEY `supplier_id` (`supplier_id`);

--
-- Indexes for table `purchaseorderitems`
--
ALTER TABLE `purchaseorderitems`
  ADD PRIMARY KEY (`id`),
  ADD KEY `poId` (`poId`),
  ADD KEY `productId` (`productId`);

--
-- Indexes for table `purchaseorders`
--
ALTER TABLE `purchaseorders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `poNumber` (`poNumber`),
  ADD KEY `supplierId` (`supplierId`),
  ADD KEY `branchId` (`branchId`);

--
-- Indexes for table `restockrequests`
--
ALTER TABLE `restockrequests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `manager_id` (`manager_id`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `admin_id` (`admin_id`);

--
-- Indexes for table `saleitems`
--
ALTER TABLE `saleitems`
  ADD PRIMARY KEY (`id`),
  ADD KEY `saleId` (`saleId`);

--
-- Indexes for table `sales`
--
ALTER TABLE `sales`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invoiceNumber` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_2` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_3` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_4` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_5` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_6` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_7` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_8` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_9` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_10` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_11` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_12` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_13` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_14` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_15` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_16` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_17` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_18` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_19` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_20` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_21` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_22` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_23` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_24` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_25` (`invoiceNumber`),
  ADD UNIQUE KEY `invoiceNumber_26` (`invoiceNumber`),
  ADD KEY `customerId` (`customerId`);

--
-- Indexes for table `stockmovements`
--
ALTER TABLE `stockmovements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `supplier_id` (`supplier_id`);

--
-- Indexes for table `stocktransferitems`
--
ALTER TABLE `stocktransferitems`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `stocktransfers`
--
ALTER TABLE `stocktransfers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `username_2` (`username`),
  ADD UNIQUE KEY `username_3` (`username`),
  ADD UNIQUE KEY `username_4` (`username`),
  ADD KEY `branch_id` (`branch_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `attendances`
--
ALTER TABLE `attendances`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `branches`
--
ALTER TABLE `branches`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inventories`
--
ALTER TABLE `inventories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `orderitems`
--
ALTER TABLE `orderitems`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=129;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=65;

--
-- AUTO_INCREMENT for table `payrolls`
--
ALTER TABLE `payrolls`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `purchaseorderitems`
--
ALTER TABLE `purchaseorderitems`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchaseorders`
--
ALTER TABLE `purchaseorders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `restockrequests`
--
ALTER TABLE `restockrequests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `stockmovements`
--
ALTER TABLE `stockmovements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `stocktransferitems`
--
ALTER TABLE `stocktransferitems`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stocktransfers`
--
ALTER TABLE `stocktransfers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `inventories`
--
ALTER TABLE `inventories`
  ADD CONSTRAINT `inventories_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `inventories_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `inventories_ibfk_3` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `inventories_ibfk_4` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `inventories_ibfk_5` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `inventories_ibfk_6` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `inventories_ibfk_7` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `inventories_ibfk_8` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `orderitems`
--
ALTER TABLE `orderitems`
  ADD CONSTRAINT `orderitems_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `orderitems_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `orderitems_ibfk_3` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `orderitems_ibfk_4` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `orderitems_ibfk_5` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `orderitems_ibfk_6` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `orderitems_ibfk_7` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `orderitems_ibfk_8` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `orders_ibfk_3` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `orders_ibfk_4` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `orders_ibfk_5` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `orders_ibfk_6` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `orders_ibfk_7` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `orders_ibfk_8` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `productbundles`
--
ALTER TABLE `productbundles`
  ADD CONSTRAINT `productbundles_ibfk_1` FOREIGN KEY (`bundle_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `productbundles_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `products_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `products_ibfk_3` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `products_ibfk_4` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `products_ibfk_5` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `products_ibfk_6` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `products_ibfk_7` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `purchaseorderitems`
--
ALTER TABLE `purchaseorderitems`
  ADD CONSTRAINT `purchaseorderitems_ibfk_1` FOREIGN KEY (`poId`) REFERENCES `purchaseorders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `purchaseorderitems_ibfk_2` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `purchaseorders`
--
ALTER TABLE `purchaseorders`
  ADD CONSTRAINT `purchaseorders_ibfk_1` FOREIGN KEY (`supplierId`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `purchaseorders_ibfk_2` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `restockrequests`
--
ALTER TABLE `restockrequests`
  ADD CONSTRAINT `restockrequests_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `restockrequests_ibfk_10` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `restockrequests_ibfk_11` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `restockrequests_ibfk_12` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `restockrequests_ibfk_13` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `restockrequests_ibfk_14` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  ADD CONSTRAINT `restockrequests_ibfk_15` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `restockrequests_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `restockrequests_ibfk_3` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `restockrequests_ibfk_4` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  ADD CONSTRAINT `restockrequests_ibfk_5` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `restockrequests_ibfk_6` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `restockrequests_ibfk_7` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `restockrequests_ibfk_8` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `restockrequests_ibfk_9` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`);

--
-- Constraints for table `saleitems`
--
ALTER TABLE `saleitems`
  ADD CONSTRAINT `saleitems_ibfk_1` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_10` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_11` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_12` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_13` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_14` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_15` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_16` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_17` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_18` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_19` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_2` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_20` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_21` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_22` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_23` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_24` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_25` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_26` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_3` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_4` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_5` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_6` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_7` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_8` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `saleitems_ibfk_9` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `sales`
--
ALTER TABLE `sales`
  ADD CONSTRAINT `sales_ibfk_1` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_10` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_11` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_12` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_13` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_14` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_15` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_16` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_17` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_18` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_19` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_2` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_20` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_21` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_22` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_23` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_24` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_25` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_26` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_3` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_4` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_5` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_6` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_7` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_8` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_9` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `stockmovements`
--
ALTER TABLE `stockmovements`
  ADD CONSTRAINT `stockmovements_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `stockmovements_ibfk_10` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `stockmovements_ibfk_11` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `stockmovements_ibfk_12` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `stockmovements_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `stockmovements_ibfk_3` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `stockmovements_ibfk_4` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `stockmovements_ibfk_5` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `stockmovements_ibfk_6` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `stockmovements_ibfk_7` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `stockmovements_ibfk_8` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `stockmovements_ibfk_9` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `users_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `users_ibfk_3` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `users_ibfk_4` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
