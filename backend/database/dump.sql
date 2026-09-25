
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
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'0001_01_01_000000_create_users_table',1),(2,'0001_01_01_000001_create_cache_table',1),(3,'0001_01_01_000002_create_jobs_table',1),(4,'2026_09_25_131532_add_role_to_users_table',1),(5,'2026_09_25_131533_create_tasks_table',1),(6,'2026_09_25_131534_create_task_attachments_table',1),(7,'2026_09_25_131535_create_task_comments_table',1),(8,'2026_09_25_150947_add_thumbnail_path_to_task_attachments_table',1),(9,'2026_09_25_151735_create_chunked_uploads_table',1),(10,'2026_09_25_152438_add_scan_status_to_task_attachments_table',1),(11,'2026_09_25_153243_add_versioning_to_task_attachments_table',1),(12,'2026_09_25_153244_add_version_group_to_chunked_uploads_table',1),(13,'2026_09_25_154943_create_exports_table',1),(14,'2026_09_25_201051_add_streaming_to_task_attachments_table',1);
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
  `stream_status` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stream_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duration` decimal(10,3) unsigned DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `task_attachments_version_group_version_unique` (`version_group`,`version`),
  KEY `task_attachments_task_id_foreign` (`task_id`),
  CONSTRAINT `task_attachments_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `task_attachments` WRITE;
/*!40000 ALTER TABLE `task_attachments` DISABLE KEYS */;
INSERT INTO `task_attachments` VALUES (1,4,'d29e544b-8b4d-3039-bf5b-eb1d46cb2c43',1,'consequuntur.pdf','attachments/185fa0ed-1bf9-3dca-9b42-df38f620da77/consequuntur.pdf',NULL,17885380,'image/jpeg','clean','2026-09-25 20:19:03',NULL,NULL,NULL,'2026-09-25 20:19:03'),(2,3,'7f3165ec-a911-30f9-a3c4-f383d6e252e8',1,'quo.docx','attachments/d76d1d41-5aca-34e5-84bd-2c18297bed4d/quo.docx',NULL,4208746,'image/png','clean','2026-09-25 20:19:03',NULL,NULL,NULL,'2026-09-25 20:19:03'),(3,5,'fd906fe4-fec7-328d-8919-607041362d1b',1,'magni.pdf','attachments/5db9d556-91d1-3eaa-8089-ad446d5f4c0b/magni.pdf',NULL,10606458,'application/vnd.openxmlformats-officedocument.wordprocessingml.document','clean','2026-09-25 20:19:03',NULL,NULL,NULL,'2026-09-25 20:19:03'),(4,8,'b9cdab39-b164-328d-8502-93a8448f4bda',1,'accusamus.jpg','attachments/8771a40e-bde3-3b6b-bb99-4215cbba95e1/accusamus.jpg',NULL,14211267,'application/vnd.openxmlformats-officedocument.wordprocessingml.document','clean','2026-09-25 20:19:03',NULL,NULL,NULL,'2026-09-25 20:19:03'),(5,16,'79b2b77b-95a9-3f57-a9d7-dd760c5230e0',1,'nesciunt.docx','attachments/517e5d3e-3c87-35e9-9520-d428d0500315/nesciunt.docx',NULL,14453050,'application/vnd.openxmlformats-officedocument.wordprocessingml.document','clean','2026-09-25 20:19:03',NULL,NULL,NULL,'2026-09-25 20:19:03'),(6,4,'08c2530c-2e0a-320a-8ab4-72c94af6a6c0',1,'qui.docx','attachments/0fea6ba9-d8d2-37b5-b2c0-0639f05cc807/qui.docx',NULL,17922860,'image/jpeg','clean','2026-09-25 20:19:03',NULL,NULL,NULL,'2026-09-25 20:19:03'),(7,7,'81b7bfdc-b0fa-34b0-964d-5912529e3e6d',1,'a.pdf','attachments/e4517ef8-b7b6-3faa-9e16-7def6b857398/a.pdf',NULL,17452616,'image/jpeg','clean','2026-09-25 20:19:03',NULL,NULL,NULL,'2026-09-25 20:19:03'),(8,6,'ac4a8b88-33a7-3805-9e32-4147c804b995',1,'quo.docx','attachments/87bae4e4-54a9-3eb4-9598-0ea3dd9498c1/quo.docx',NULL,3360866,'image/png','clean','2026-09-25 20:19:03',NULL,NULL,NULL,'2026-09-25 20:19:03'),(9,19,'d5e9e7aa-887d-36f4-bf69-b929e33b6040',1,'voluptatem.png','attachments/e587b285-8a00-3181-abe0-2391ad8bac37/voluptatem.png',NULL,6724667,'application/vnd.openxmlformats-officedocument.wordprocessingml.document','clean','2026-09-25 20:19:03',NULL,NULL,NULL,'2026-09-25 20:19:03'),(10,15,'cfea023a-4c13-3b08-b164-103d76f86cb9',1,'voluptatibus.docx','attachments/fd957d4e-6588-386a-b200-d36286556945/voluptatibus.docx',NULL,16878037,'image/png','clean','2026-09-25 20:19:03',NULL,NULL,NULL,'2026-09-25 20:19:03');
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
INSERT INTO `task_comments` VALUES (1,8,7,'Maiores accusamus nihil consectetur velit rem quo blanditiis sit amet omnis.','2026-09-25 20:19:03'),(2,13,6,'Repellendus aut nulla vel voluptatem praesentium est ipsam reprehenderit aut.','2026-09-25 20:19:03'),(3,19,6,'Dolores cum dignissimos nobis ex facilis odio facilis temporibus ut animi dolorum numquam.','2026-09-25 20:19:03'),(4,11,5,'Molestiae sit itaque officiis molestiae ducimus doloribus quia delectus possimus laborum dolorum quo.','2026-09-25 20:19:03'),(5,12,5,'Provident illum veniam et est qui similique non qui perspiciatis qui sunt aut.','2026-09-25 20:19:03'),(6,5,7,'Qui non fugit maxime minus autem facere sed nemo temporibus at.','2026-09-25 20:19:03'),(7,3,6,'Dicta ut consequatur perferendis dolorum quod ea ab nihil cum voluptatem blanditiis dolorum omnis esse.','2026-09-25 20:19:03'),(8,9,1,'Blanditiis et rerum id dolorem rerum autem magnam repellat qui.','2026-09-25 20:19:03'),(9,9,2,'Quod officia sed ut similique quod fuga facilis vel quis aut aut qui quisquam ut nemo quam.','2026-09-25 20:19:03'),(10,18,6,'Ipsam quia optio ex iure perspiciatis pariatur nostrum.','2026-09-25 20:19:03'),(11,10,7,'Rerum architecto impedit pariatur fuga dolore facilis harum vero omnis.','2026-09-25 20:19:03'),(12,16,7,'Aliquam eius sit corporis omnis qui id accusantium.','2026-09-25 20:19:03'),(13,6,2,'Saepe dolor itaque doloremque cumque sed hic ducimus aliquam sit nulla natus omnis atque esse.','2026-09-25 20:19:03'),(14,10,5,'Quia facere officia officiis aut fugiat maiores rerum et laudantium id doloribus dolorum.','2026-09-25 20:19:03'),(15,14,3,'Sed explicabo sed officiis labore vel est aut consequatur et blanditiis recusandae voluptas.','2026-09-25 20:19:03'),(16,9,7,'Sit odit facilis quis provident necessitatibus distinctio sunt earum reprehenderit consequatur quas.','2026-09-25 20:19:03'),(17,16,5,'Sunt eveniet asperiores iste eos est animi commodi corrupti nihil ad velit enim quaerat et qui.','2026-09-25 20:19:03'),(18,2,5,'Consequatur alias et omnis ut et a neque.','2026-09-25 20:19:03'),(19,11,5,'Dolores at pariatur autem soluta in nam eum et sed tempora animi harum temporibus qui.','2026-09-25 20:19:03'),(20,20,5,'Quia nesciunt et placeat reiciendis minima et ex vel aut deserunt hic labore aliquid accusamus.','2026-09-25 20:19:03'),(21,8,2,'Excepturi maiores id officia illo enim at ipsa rerum non ut voluptatem voluptatem unde velit cumque reiciendis.','2026-09-25 20:19:03'),(22,10,6,'Non impedit quas tempore dolor sunt non qui dolorem.','2026-09-25 20:19:03'),(23,19,4,'Asperiores explicabo voluptate mollitia dolore eaque voluptatibus a et exercitationem quia minus quia est optio.','2026-09-25 20:19:03'),(24,17,1,'Eveniet accusamus facere amet ea vel est sapiente adipisci voluptate voluptas aut.','2026-09-25 20:19:03'),(25,20,4,'Ea ipsum reprehenderit veniam nemo unde dolorem animi voluptatem.','2026-09-25 20:19:03'),(26,17,5,'Porro aperiam sint asperiores est omnis aut autem deleniti mollitia aut omnis.','2026-09-25 20:19:03'),(27,8,5,'Unde non dolorem nobis tempore illum et voluptates fugiat reiciendis corrupti quae.','2026-09-25 20:19:03'),(28,1,2,'Cupiditate sed enim officia alias quia et officiis voluptas qui eaque est iusto.','2026-09-25 20:19:03'),(29,20,3,'Assumenda et sint ea delectus ipsa et numquam quidem velit nesciunt pariatur quos et.','2026-09-25 20:19:03'),(30,11,7,'Qui enim dignissimos placeat doloribus ea sunt enim enim quae repudiandae dolorum in deserunt.','2026-09-25 20:19:03'),(31,7,7,'Voluptatum commodi necessitatibus cum natus omnis recusandae omnis eveniet accusamus quis nihil.','2026-09-25 20:19:03'),(32,18,6,'Enim quibusdam vero aut et commodi iusto fugit sed qui tempore facilis id voluptatem culpa officia ullam.','2026-09-25 20:19:03'),(33,1,2,'Modi eos harum quo reiciendis ratione atque iusto necessitatibus consequatur esse aspernatur libero.','2026-09-25 20:19:03'),(34,10,3,'Et qui voluptates pariatur in harum aut ut accusamus earum accusamus quasi voluptas dicta.','2026-09-25 20:19:03'),(35,8,1,'Nam inventore commodi et maxime veniam possimus nemo.','2026-09-25 20:19:03');
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
INSERT INTO `tasks` VALUES (1,'Eum quibusdam ipsum et inventore soluta.','Quis amet suscipit aut et. Earum porro vel debitis. Placeat harum illum quis molestias velit et id.','pending','low',7,7,'2026-11-10','2026-09-25 20:19:03','2026-09-25 20:19:03'),(2,'Porro rerum iure quo.','Sint ex rerum id id atque. Officiis tenetur blanditiis dolorem facere quod ipsam laudantium. Reprehenderit voluptas laboriosam at qui quia.','pending','low',4,6,'2026-10-29','2026-09-25 20:19:03','2026-09-25 20:19:03'),(3,'Qui ab aut quasi eaque cumque molestiae.','Sequi quas eaque ut laudantium quod quis quia quidem. Fugiat iure explicabo magni sit quo ut. Molestias blanditiis qui quidem et voluptatum.','completed','urgent',2,3,'2026-10-24','2026-09-25 20:19:03','2026-09-25 20:19:03'),(4,'Dolore qui qui dolorem velit.','Molestias non sunt iusto repellat culpa. Non voluptate autem inventore. Magnam sit nulla quo aut porro labore pariatur. Occaecati ipsam debitis deserunt dolores laborum officiis corporis. Similique dignissimos quia sit maiores numquam.','completed','low',4,7,NULL,'2026-09-25 20:19:03','2026-09-25 20:19:03'),(5,'A ipsam ut quos quam placeat.','Nemo provident quam voluptatem rerum et et consequatur. Minima voluptatem excepturi sapiente qui. Neque nobis iste libero quia. Voluptates non officia rerum facere.','completed','high',2,7,'2026-10-02','2026-09-25 20:19:03','2026-09-25 20:19:03'),(6,'Commodi et laborum quasi facere.','Molestiae explicabo qui quia repudiandae rerum nobis. Distinctio ducimus sint reiciendis impedit.','cancelled','low',2,6,NULL,'2026-09-25 20:19:03','2026-09-25 20:19:03'),(7,'Totam asperiores quia non facilis qui voluptatibus doloremque unde.','Qui eius amet voluptatem voluptas sed. Autem minus impedit quis sit blanditiis quaerat. Omnis aperiam enim occaecati quibusdam iure.','cancelled','urgent',1,3,NULL,'2026-09-25 20:19:03','2026-09-25 20:19:03'),(8,'Sapiente veniam aut et et voluptas aut et sit.','Quam illo velit exercitationem eaque ipsum et pariatur. Repellat quasi eum iste vero tempora nam. Omnis saepe voluptatem quia nesciunt quibusdam. Provident et consectetur tenetur ut et iusto ut.','in_progress','medium',1,2,'2026-10-14','2026-09-25 20:19:03','2026-09-25 20:19:03'),(9,'Et neque est cum dolorum.','Atque sequi culpa voluptatem quia sed. Consequuntur tenetur quia aliquid qui nostrum rerum.','cancelled','high',6,1,NULL,'2026-09-25 20:19:03','2026-09-25 20:19:03'),(10,'Aut asperiores laboriosam autem recusandae reiciendis et ut.','Ipsum quis qui autem. Iste et est dolores est magnam. Quos enim et temporibus et.','completed','medium',3,1,NULL,'2026-09-25 20:19:03','2026-09-25 20:19:03'),(11,'Et distinctio deserunt delectus assumenda quod tempora recusandae rerum.','Occaecati in officiis vero sed quaerat earum omnis. Et sit minus fugiat molestias a. Culpa tempore nesciunt necessitatibus corrupti mollitia aut rem. Dolores dolore voluptas sit eum ipsam totam.','cancelled','urgent',3,6,NULL,'2026-09-25 20:19:03','2026-09-25 20:19:03'),(12,'Tenetur et et sit inventore.','Deserunt odit quidem iure ut enim ut cum aspernatur. Non qui in veniam voluptas fugiat et consectetur natus. Quia nisi sed repudiandae ad exercitationem. Sunt et vitae magnam ducimus veritatis quia.','in_progress','medium',7,5,'2026-10-19','2026-09-25 20:19:03','2026-09-25 20:19:03'),(13,'Non hic dolor sed ab recusandae dolorem.','Sit ad quod libero minima quia inventore quaerat. Neque maiores consequatur voluptatibus. Modi magni ad aut et sit velit sint. Non aut provident non mollitia corporis saepe sunt.','cancelled','urgent',6,4,NULL,'2026-09-25 20:19:03','2026-09-25 20:19:03'),(14,'Deleniti minus in vel dolorem animi et.','Deleniti quaerat laudantium assumenda maiores iure quis. Numquam natus quod quia quo. Sint aliquam et quod excepturi. Dolor ut id nulla voluptatem nihil nam id officiis.','completed','medium',2,3,'2026-11-12','2026-09-25 20:19:03','2026-09-25 20:19:03'),(15,'Ut beatae qui eum suscipit dignissimos culpa sed.','Reprehenderit expedita vel similique ducimus. Sit possimus incidunt voluptas tenetur iste libero dolore. Molestias dignissimos quod quod rerum culpa sint rerum qui. Iure animi iusto modi.','cancelled','high',7,4,NULL,'2026-09-25 20:19:03','2026-09-25 20:19:03'),(16,'Eum et a ut quis possimus soluta maxime a.','Iusto blanditiis nisi enim. Totam amet voluptas nulla qui. Et et sit non quae. Tempore molestiae ut incidunt aut quo.','completed','low',1,4,NULL,'2026-09-25 20:19:03','2026-09-25 20:19:03'),(17,'Aspernatur rerum aut mollitia enim voluptatibus perferendis quibusdam.','Est sunt ut et voluptates. Provident id qui a voluptatem quia officia et et. Expedita ullam voluptatem asperiores ea fuga impedit adipisci. Molestiae velit unde expedita eos facere et facere.','pending','high',7,6,'2026-10-20','2026-09-25 20:19:03','2026-09-25 20:19:03'),(18,'Perferendis fugit dignissimos ea.','Minus ex veniam nemo. Dolor laboriosam ipsam cupiditate velit sit veniam voluptatem. Distinctio aliquam sunt cupiditate qui cupiditate.','completed','medium',1,1,'2026-10-17','2026-09-25 20:19:03','2026-09-25 20:19:03'),(19,'Eos doloribus quaerat rerum architecto adipisci consequatur sed.','Laborum quibusdam unde illo iste sed. Consectetur mollitia eius qui aliquam aut beatae ut. Nesciunt esse tempora sapiente cum hic. Dolor reprehenderit harum quia similique. Esse mollitia eum ut sit.','pending','low',6,3,'2026-09-28','2026-09-25 20:19:03','2026-09-25 20:19:03'),(20,'Doloremque aspernatur voluptas ut tenetur magnam voluptatem rerum.','Laboriosam fugit commodi distinctio error vitae. Possimus et sed eligendi praesentium. Magni natus officia consequatur qui nam est saepe.','completed','medium',3,3,'2026-10-30','2026-09-25 20:19:03','2026-09-25 20:19:03');
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
INSERT INTO `users` VALUES (1,'Test Admin','admin@example.com','2026-09-25 20:19:03','$2y$12$VTUzBm/JeC0vqmtnddRVn.4JD2oP4UvMOM3pu4QxW4gx2JMoViSSu','admin','O4eXK3cFgh','2026-09-25 20:19:03','2026-09-25 20:19:03'),(2,'Alysa Schaefer','joany49@example.org','2026-09-25 20:19:03','$2y$12$VTUzBm/JeC0vqmtnddRVn.4JD2oP4UvMOM3pu4QxW4gx2JMoViSSu','member','E98IaJdNSB','2026-09-25 20:19:03','2026-09-25 20:19:03'),(3,'Mr. Moriah Bogan','mercedes18@example.net','2026-09-25 20:19:03','$2y$12$VTUzBm/JeC0vqmtnddRVn.4JD2oP4UvMOM3pu4QxW4gx2JMoViSSu','member','OZ0CqSXdpw','2026-09-25 20:19:03','2026-09-25 20:19:03'),(4,'Garth Herzog','friedrich88@example.com','2026-09-25 20:19:03','$2y$12$VTUzBm/JeC0vqmtnddRVn.4JD2oP4UvMOM3pu4QxW4gx2JMoViSSu','member','XgLZAeWLVK','2026-09-25 20:19:03','2026-09-25 20:19:03'),(5,'Miss Rose Lynch','hbeier@example.com','2026-09-25 20:19:03','$2y$12$VTUzBm/JeC0vqmtnddRVn.4JD2oP4UvMOM3pu4QxW4gx2JMoViSSu','member','WdcnRvoxDf','2026-09-25 20:19:03','2026-09-25 20:19:03'),(6,'Prof. Ramon Ebert II','mosciski.william@example.net','2026-09-25 20:19:03','$2y$12$VTUzBm/JeC0vqmtnddRVn.4JD2oP4UvMOM3pu4QxW4gx2JMoViSSu','member','m6vPKaT4rG','2026-09-25 20:19:03','2026-09-25 20:19:03'),(7,'Wilfred Wyman','wintheiser.tristin@example.org','2026-09-25 20:19:03','$2y$12$VTUzBm/JeC0vqmtnddRVn.4JD2oP4UvMOM3pu4QxW4gx2JMoViSSu','member','pqGtjFrZYk','2026-09-25 20:19:03','2026-09-25 20:19:03');
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

