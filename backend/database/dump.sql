
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` bigint NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `cache` WRITE;
/*!40000 ALTER TABLE `cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` bigint NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `cache_locks` WRITE;
/*!40000 ALTER TABLE `cache_locks` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache_locks` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `chunked_uploads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chunked_uploads` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `task_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `version_group` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint unsigned NOT NULL,
  `chunk_size` int unsigned NOT NULL,
  `total_chunks` int unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `chunked_uploads_task_id_foreign` (`task_id`),
  KEY `chunked_uploads_user_id_foreign` (`user_id`),
  KEY `chunked_uploads_created_at_index` (`created_at`),
  CONSTRAINT `chunked_uploads_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chunked_uploads_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `chunked_uploads` WRITE;
/*!40000 ALTER TABLE `chunked_uploads` DISABLE KEYS */;
/*!40000 ALTER TABLE `chunked_uploads` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `exports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exports` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `format` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `filters` json NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `row_count` int unsigned DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `exports_user_id_created_at_index` (`user_id`,`created_at`),
  KEY `exports_created_at_index` (`created_at`),
  CONSTRAINT `exports_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `exports` WRITE;
/*!40000 ALTER TABLE `exports` DISABLE KEYS */;
/*!40000 ALTER TABLE `exports` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`),
  KEY `failed_jobs_connection_queue_failed_at_index` (`connection`,`queue`,`failed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `failed_jobs` WRITE;
/*!40000 ALTER TABLE `failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `job_batches` WRITE;
/*!40000 ALTER TABLE `job_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_batches` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` smallint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'0001_01_01_000000_create_users_table',1),(2,'0001_01_01_000001_create_cache_table',1),(3,'0001_01_01_000002_create_jobs_table',1),(4,'2026_09_25_131532_add_role_to_users_table',1),(5,'2026_09_25_131533_create_tasks_table',1),(6,'2026_09_25_131534_create_task_attachments_table',1),(7,'2026_09_25_131535_create_task_comments_table',1),(8,'2026_09_25_150947_add_thumbnail_path_to_task_attachments_table',1),(9,'2026_09_25_151735_create_chunked_uploads_table',1),(10,'2026_09_25_152438_add_scan_status_to_task_attachments_table',1),(11,'2026_09_25_153243_add_versioning_to_task_attachments_table',1),(12,'2026_09_25_153244_add_version_group_to_chunked_uploads_table',1),(13,'2026_09_25_154943_create_exports_table',1);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `task_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_attachments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint unsigned NOT NULL,
  `version_group` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` int unsigned NOT NULL DEFAULT '1',
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `thumbnail_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` bigint unsigned NOT NULL,
  `mime_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scan_status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `scanned_at` timestamp NULL DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `task_attachments_version_group_version_unique` (`version_group`,`version`),
  KEY `task_attachments_task_id_foreign` (`task_id`),
  CONSTRAINT `task_attachments_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `task_attachments` WRITE;
/*!40000 ALTER TABLE `task_attachments` DISABLE KEYS */;
INSERT INTO `task_attachments` VALUES (1,4,'37e05e5c-defc-384e-8881-114243f18608',1,'ut.pdf','attachments/bdab48f1-73f9-35f3-9acc-7a76b5fd1a87/ut.pdf',NULL,4414723,'application/vnd.openxmlformats-officedocument.wordprocessingml.document','clean','2026-09-25 18:48:19','2026-09-25 18:48:19'),(2,7,'58566a1e-4ab0-33d5-90e2-fad33f7ba421',1,'vel.jpg','attachments/89ee7f7d-02ca-3897-82ef-14269341a5de/vel.jpg',NULL,16640421,'application/pdf','clean','2026-09-25 18:48:19','2026-09-25 18:48:19'),(3,10,'56636f3a-136a-3379-87ae-28fee6a05a42',1,'omnis.jpg','attachments/d60e34c9-389c-3d04-84c6-39d558774728/omnis.jpg',NULL,9679249,'image/jpeg','clean','2026-09-25 18:48:19','2026-09-25 18:48:19'),(4,2,'bd9a06ae-1586-375b-be31-994de555980e',1,'voluptas.png','attachments/bc2d59a1-a4a2-327e-b741-19441470b1c1/voluptas.png',NULL,2436791,'image/jpeg','clean','2026-09-25 18:48:19','2026-09-25 18:48:19'),(5,18,'2c2659bf-651e-32db-b87b-082717030265',1,'non.png','attachments/7dfa963d-0d3d-304f-a95a-90f51aaf2d07/non.png',NULL,18992075,'application/vnd.openxmlformats-officedocument.wordprocessingml.document','clean','2026-09-25 18:48:19','2026-09-25 18:48:19'),(6,7,'50ad20d3-1273-35cd-9249-f61da8feb53d',1,'quod.pdf','attachments/7942b65c-64eb-32c1-9281-596485730b1c/quod.pdf',NULL,9546637,'image/png','clean','2026-09-25 18:48:19','2026-09-25 18:48:19'),(7,6,'e6692a2f-8d47-36fe-a7e6-74bbb3b77326',1,'consequuntur.png','attachments/79e22833-24fb-3a2f-91d4-1d88b6a80612/consequuntur.png',NULL,15809274,'application/vnd.openxmlformats-officedocument.wordprocessingml.document','clean','2026-09-25 18:48:19','2026-09-25 18:48:19'),(8,14,'b7e1a8b2-cb94-3bbc-abd5-fa90cc93c7dd',1,'ullam.pdf','attachments/a6a57c11-7cc6-3d41-8c3e-5c5a759c09bf/ullam.pdf',NULL,750366,'application/vnd.openxmlformats-officedocument.wordprocessingml.document','clean','2026-09-25 18:48:19','2026-09-25 18:48:19'),(9,14,'c7705d49-9e25-35cb-a375-8180e51c4db2',1,'deserunt.docx','attachments/0917cfbd-7c25-30c2-bb8d-131e905be70f/deserunt.docx',NULL,14675953,'image/jpeg','clean','2026-09-25 18:48:19','2026-09-25 18:48:19'),(10,20,'ab47f438-266b-332f-8f80-fbe42b666276',1,'doloremque.png','attachments/aaa5f325-21db-3116-ab6f-47a4880b5850/doloremque.png',NULL,6850817,'application/vnd.openxmlformats-officedocument.wordprocessingml.document','clean','2026-09-25 18:48:19','2026-09-25 18:48:19');
/*!40000 ALTER TABLE `task_attachments` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `task_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_comments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `task_comments_task_id_foreign` (`task_id`),
  KEY `task_comments_user_id_foreign` (`user_id`),
  CONSTRAINT `task_comments_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_comments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `task_comments` WRITE;
/*!40000 ALTER TABLE `task_comments` DISABLE KEYS */;
INSERT INTO `task_comments` VALUES (1,16,7,'Omnis reprehenderit dolorem ut aut sint dolorem unde quia magnam ullam cupiditate sapiente aut.','2026-09-25 18:48:19'),(2,10,5,'Velit culpa consequatur quod deleniti illum dolor cumque beatae rerum error autem maiores.','2026-09-25 18:48:19'),(3,12,4,'Eos dolor officiis et officiis eveniet itaque eum occaecati esse.','2026-09-25 18:48:19'),(4,14,1,'Quisquam aspernatur commodi sit qui consequatur quisquam quisquam voluptas dolores.','2026-09-25 18:48:19'),(5,17,7,'Sed officia non non voluptatum doloribus et labore enim et nostrum.','2026-09-25 18:48:19'),(6,20,1,'Dolor aspernatur et consectetur sint et esse inventore sunt.','2026-09-25 18:48:19'),(7,18,3,'Soluta reprehenderit rerum provident similique cupiditate quo vero qui quisquam perferendis at et sint omnis odio rerum.','2026-09-25 18:48:19'),(8,20,7,'Non quo nihil omnis minima illo inventore sint totam tenetur nobis hic id mollitia nostrum.','2026-09-25 18:48:19'),(9,7,2,'Dolores cum vero aliquid quis molestias reiciendis exercitationem tempore sit voluptates rerum molestias ut neque praesentium eaque.','2026-09-25 18:48:19'),(10,7,1,'Perspiciatis quae et modi eligendi aliquam odio debitis illum.','2026-09-25 18:48:19'),(11,10,5,'Sequi aut et rerum consequuntur dolores error a iste.','2026-09-25 18:48:19'),(12,3,5,'Voluptatum in quo ipsum fugit necessitatibus maiores eaque iste accusamus nam ducimus quibusdam reiciendis.','2026-09-25 18:48:19'),(13,10,4,'Fugiat doloremque doloremque labore eaque aperiam in accusantium sit ut dignissimos.','2026-09-25 18:48:19'),(14,18,3,'Sunt doloribus sed tenetur laboriosam illo vel et mollitia ut impedit ullam quia dolorem aut recusandae.','2026-09-25 18:48:19'),(15,16,6,'Recusandae architecto quis sit nulla quia et nisi labore saepe.','2026-09-25 18:48:19'),(16,5,4,'Perferendis sit veniam repellat fuga maxime non ut perspiciatis.','2026-09-25 18:48:19'),(17,12,3,'Non nam voluptas qui sit officia beatae minus perspiciatis non qui qui doloribus impedit fugiat.','2026-09-25 18:48:19'),(18,17,3,'Et beatae adipisci possimus et laboriosam facere repellendus culpa aut similique aliquid.','2026-09-25 18:48:19'),(19,9,3,'Quia minima ad aut quidem eaque quia incidunt.','2026-09-25 18:48:19'),(20,17,3,'Corrupti nemo libero delectus non consequatur aut quae nesciunt aut.','2026-09-25 18:48:19'),(21,19,5,'Voluptatem sint sed sit aut aut blanditiis fuga harum deleniti.','2026-09-25 18:48:19'),(22,4,5,'Neque alias aut nam fuga et numquam cupiditate cum.','2026-09-25 18:48:19'),(23,20,7,'Placeat aut sit nam cum aut culpa mollitia earum eaque autem similique voluptates earum et et.','2026-09-25 18:48:19'),(24,17,1,'Doloribus laboriosam hic veniam aut voluptatum accusamus sint est facere iste voluptas.','2026-09-25 18:48:19'),(25,8,2,'Eligendi ratione magni magni ipsum modi enim sed at magni maxime ab qui similique rerum repellat perspiciatis.','2026-09-25 18:48:19'),(26,8,7,'Reiciendis dolor voluptatem vel quasi odio dolore labore autem harum magni rerum beatae est ipsa nostrum a.','2026-09-25 18:48:19'),(27,15,2,'Qui consequuntur eligendi earum veniam rerum veritatis recusandae mollitia omnis molestias quia laudantium.','2026-09-25 18:48:19'),(28,10,4,'Molestias est molestiae dolore illo tempora suscipit non voluptatem corporis quis aut asperiores dolorem dolorum cupiditate.','2026-09-25 18:48:19'),(29,5,4,'Consequuntur expedita qui blanditiis eum culpa dignissimos voluptatibus illo.','2026-09-25 18:48:19'),(30,16,5,'Quia ut qui dolor perferendis est est repellat occaecati veritatis placeat est.','2026-09-25 18:48:19'),(31,10,2,'Qui voluptates sequi laboriosam asperiores quam facere in tenetur quaerat delectus sed est voluptas.','2026-09-25 18:48:19'),(32,11,3,'Beatae vel nesciunt excepturi eveniet tempora ut ex et qui voluptas recusandae blanditiis dicta ut.','2026-09-25 18:48:19'),(33,8,4,'Eum quasi ducimus pariatur ut laborum asperiores tempora praesentium inventore tempora minus quas id quibusdam eum vel.','2026-09-25 18:48:19'),(34,3,7,'Sit nulla id dolor soluta quo veniam nam possimus in ut non et qui.','2026-09-25 18:48:19'),(35,17,3,'Repellendus ut et vel magnam eaque ut quia perspiciatis natus rerum laborum.','2026-09-25 18:48:19');
/*!40000 ALTER TABLE `task_comments` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tasks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `priority` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
  `assigned_user_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `due_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tasks_assigned_user_id_foreign` (`assigned_user_id`),
  KEY `tasks_created_by_foreign` (`created_by`),
  KEY `tasks_status_priority_index` (`status`,`priority`),
  KEY `tasks_due_date_index` (`due_date`),
  CONSTRAINT `tasks_assigned_user_id_foreign` FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tasks_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `tasks` WRITE;
/*!40000 ALTER TABLE `tasks` DISABLE KEYS */;
INSERT INTO `tasks` VALUES (1,'Dolor facilis sit quidem at.','Aut et id repellendus et iusto. Et quis voluptatem ullam quia. Voluptatem distinctio temporibus ab dolor quis officiis esse.','in_progress','urgent',2,6,NULL,'2026-09-25 18:48:19','2026-09-25 18:48:19'),(2,'Rem rem natus labore eum iusto.','Odit dolores aliquam voluptatum nostrum qui sint aut. Qui ipsa et ad modi doloribus et nihil. Est et quo tempore praesentium assumenda. Quis culpa tempore aut est.','pending','urgent',7,4,NULL,'2026-09-25 18:48:19','2026-09-25 18:48:19'),(3,'Error quam ut reiciendis tenetur.','Veritatis eos iure eligendi sed. Adipisci sequi quaerat itaque rerum ut nam voluptates. Excepturi non exercitationem hic dolores natus id fugit.','pending','medium',2,4,'2026-10-02','2026-09-25 18:48:19','2026-09-25 18:48:19'),(4,'Est numquam illo ratione quia rerum incidunt.','Consequatur voluptas corrupti sit iusto non ex autem. Numquam qui accusamus repellat recusandae autem dolor fuga aspernatur. Id itaque et et.','cancelled','low',3,1,NULL,'2026-09-25 18:48:19','2026-09-25 18:48:19'),(5,'Voluptate culpa dolorem qui omnis autem optio sint.','Deleniti dolorum voluptatum cumque perferendis velit. Harum accusamus aut quam incidunt. Dignissimos enim qui exercitationem consequatur dolorem voluptas officiis. Qui totam aut deleniti sit vel est.','pending','urgent',1,1,'2026-11-16','2026-09-25 18:48:19','2026-09-25 18:48:19'),(6,'Vel iusto unde et nihil.','Optio aspernatur est fuga perferendis eaque et. Rerum ut molestiae adipisci et nam modi odit in. Harum sit impedit quo aut quia dolores necessitatibus. Dicta quia quidem culpa ea odit voluptatem dolores.','cancelled','high',2,3,NULL,'2026-09-25 18:48:19','2026-09-25 18:48:19'),(7,'Veritatis adipisci amet et nemo occaecati perferendis.','Velit et labore fuga quas. Modi ex a quasi fuga non eaque aut aliquid. Quis non sit dolorem vero. Aut magni officiis autem.','pending','high',1,5,'2026-09-28','2026-09-25 18:48:19','2026-09-25 18:48:19'),(8,'Dolore qui soluta tempora quae omnis commodi architecto.','Omnis est laboriosam ex expedita rem magni. Assumenda doloremque eum nam voluptatibus eaque vero. Deleniti ab quia voluptate dolor commodi voluptate distinctio. Autem omnis aperiam soluta.','pending','medium',7,5,NULL,'2026-09-25 18:48:19','2026-09-25 18:48:19'),(9,'Sit porro et voluptas assumenda.','Maiores sed rerum rerum aut qui nam ea. Et quos velit officia aut vel.','cancelled','urgent',4,3,NULL,'2026-09-25 18:48:19','2026-09-25 18:48:19'),(10,'Quos dolores quia quia impedit fuga dolor.','In in quaerat voluptatem assumenda est aliquam distinctio. Non dolore nihil sed sint debitis. Cum sit rerum et porro consequatur voluptatum. Harum deserunt omnis aliquam maxime ipsum.','completed','urgent',3,3,'2026-11-21','2026-09-25 18:48:19','2026-09-25 18:48:19'),(11,'Et omnis est ut consequuntur ipsa quam.','Quia libero minus consequuntur sint maxime esse eos. Tenetur qui nesciunt debitis officia voluptatem quisquam voluptates. Sed tempore facere aspernatur nihil nihil. Distinctio asperiores ad officia. Eveniet ut qui rerum occaecati.','pending','low',4,7,'2026-10-27','2026-09-25 18:48:19','2026-09-25 18:48:19'),(12,'Excepturi hic consequatur sed aut qui aut non.','Assumenda voluptatem saepe nihil. Rem tempora amet qui qui aspernatur quo et. Consequatur est aut consequatur voluptas qui.','in_progress','high',5,5,'2026-10-10','2026-09-25 18:48:19','2026-09-25 18:48:19'),(13,'Et mollitia inventore perspiciatis perspiciatis.','Eligendi atque beatae dolor et et consequatur. Sit eos voluptatem ut. Officia autem et quis.','cancelled','low',1,4,NULL,'2026-09-25 18:48:19','2026-09-25 18:48:19'),(14,'Eum dolore voluptas eos harum eius.','Ut ea illo fuga corporis aspernatur. Ipsum rerum non voluptatem. Quia id rem quos laborum. Error facere et dicta nemo et nam.','pending','medium',7,5,NULL,'2026-09-25 18:48:19','2026-09-25 18:48:19'),(15,'Explicabo et reprehenderit veniam quisquam.','Sequi quia quo ratione. Aspernatur non optio ut temporibus harum corrupti. Consequuntur sed occaecati sint enim omnis et quo tenetur. Vitae et vel hic tempore illo dolores.','completed','urgent',6,6,'2026-10-09','2026-09-25 18:48:19','2026-09-25 18:48:19'),(16,'Debitis ullam perspiciatis quam libero esse.','Sed rerum consequatur pariatur velit neque aliquid. Minima fugit aspernatur et non.','completed','high',2,7,'2026-09-26','2026-09-25 18:48:19','2026-09-25 18:48:19'),(17,'Officia itaque reiciendis ullam et.','Atque et sunt deserunt velit quae. Voluptatem labore consequatur consequatur qui.','completed','medium',6,3,'2026-11-02','2026-09-25 18:48:19','2026-09-25 18:48:19'),(18,'Autem laudantium sit eius quibusdam illum.','Aut adipisci blanditiis quo quas voluptatem ad dignissimos. Numquam ea quis totam sit. Et ut sunt vero in optio ducimus.','completed','high',6,4,NULL,'2026-09-25 18:48:19','2026-09-25 18:48:19'),(19,'Porro dignissimos aperiam error error assumenda.','Rem culpa accusantium id sed. Modi omnis autem quod unde laboriosam sint tenetur dicta. Voluptatem ad voluptas at et fuga at aliquid. Quia id alias sit ea fuga.','completed','urgent',7,6,NULL,'2026-09-25 18:48:19','2026-09-25 18:48:19'),(20,'Et nostrum doloribus et.','Explicabo rerum sunt nulla voluptatem. Qui velit aliquid unde labore dolores aliquam nihil. Aspernatur totam cumque ea aspernatur enim eius rerum. Ut ducimus delectus sed quisquam quo modi vel ea.','in_progress','urgent',6,5,NULL,'2026-09-25 18:48:19','2026-09-25 18:48:19');
/*!40000 ALTER TABLE `tasks` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'member',
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_role_index` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Test Admin','admin@example.com','2026-09-25 18:48:19','$2y$12$i7DfdjSaXzNNpl9oeYrugeK5uVz15MWS/jUn.hC/Ivbe5plsKRe8S','admin','GMLsgt5Uus','2026-09-25 18:48:19','2026-09-25 18:48:19'),(2,'Dave Ritchie','nebert@example.net','2026-09-25 18:48:19','$2y$12$i7DfdjSaXzNNpl9oeYrugeK5uVz15MWS/jUn.hC/Ivbe5plsKRe8S','member','w9ClhxlSGa','2026-09-25 18:48:19','2026-09-25 18:48:19'),(3,'Domenick Terry','ken.bergstrom@example.org','2026-09-25 18:48:19','$2y$12$i7DfdjSaXzNNpl9oeYrugeK5uVz15MWS/jUn.hC/Ivbe5plsKRe8S','member','SWA39cZJxL','2026-09-25 18:48:19','2026-09-25 18:48:19'),(4,'Dante Kessler DDS','eugenia33@example.net','2026-09-25 18:48:19','$2y$12$i7DfdjSaXzNNpl9oeYrugeK5uVz15MWS/jUn.hC/Ivbe5plsKRe8S','member','w493YqFLoK','2026-09-25 18:48:19','2026-09-25 18:48:19'),(5,'Hilton Bashirian','mayert.ada@example.com','2026-09-25 18:48:19','$2y$12$i7DfdjSaXzNNpl9oeYrugeK5uVz15MWS/jUn.hC/Ivbe5plsKRe8S','member','MGRtvy5d49','2026-09-25 18:48:19','2026-09-25 18:48:19'),(6,'Russel Berge','agulgowski@example.com','2026-09-25 18:48:19','$2y$12$i7DfdjSaXzNNpl9oeYrugeK5uVz15MWS/jUn.hC/Ivbe5plsKRe8S','member','cp8JjyFgs0','2026-09-25 18:48:19','2026-09-25 18:48:19'),(7,'Bert Wintheiser','hollie35@example.com','2026-09-25 18:48:19','$2y$12$i7DfdjSaXzNNpl9oeYrugeK5uVz15MWS/jUn.hC/Ivbe5plsKRe8S','member','EOBdMlpiKw','2026-09-25 18:48:19','2026-09-25 18:48:19');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

