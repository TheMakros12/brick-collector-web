@echo off
set DB_HOST=ep-billowing-mouse-as4cdcpq-pooler.c-4.eu-central-1.aws.neon.tech
set DB_USER=neondb_owner
set DB_PASSWORD=npg_v9YhCtHT6lsZ
set BRICKECONOMY_API_KEY=test
set REBRICKABLE_API_KEY=f138411743940f84bc3cd94fbdc27848
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=dev -X
