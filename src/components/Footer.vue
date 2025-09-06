<template>
  <footer class="footer">
    <div class="footer-main">
      <!-- ซ้าย -->
      <div class="footer-left">
        <img src="../assets/logo.png" alt="JoinUp Logo" class="logo" />
        <h4>บริษัท จอยอัป จำกัด</h4>
        <p>
          88 อาคารกิตติเดชพลาซ่า ชั้น 15, ถนนเพชรบุรีตัดใหม่,<br />
          แขวงบางกะปิ, เขตห้วยขวาง, กรุงเทพมหานคร 10310
        </p>
      </div>

      <!-- ขวา -->
      <div class="footer-right">
        <h4>ติดต่อเรา</h4>
        <p>โทร : 02 345 6789</p>
        <p>อีเมล : support@eventmockup.com</p>
      </div>
    </div>

    <!-- ล่าง -->
  <div class="footer-bottom">
    <p>©2025 JoinUp All rights reserved. Version 1</p>
  </div>
  </footer>
</template>

<style scoped>
.footer {
  background: #fff;
  width: 100%;                /* กินเต็ม */
  font-size: 14px;
  color: #333;
  padding: 32px 60px 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-sizing: border-box;     /* กัน padding ทำให้กว้างเกิน */
  
}
.footer-main {
  display: flex;
  justify-content: space-between;  /* ดันซ้าย-ขวาออกห่าง */
  align-items: flex-start;
  gap: 40px;
  width: 80%;
}

.footer-bottom {
  border-top: 1px solid #e5e5e5;
  padding-top: 10px;
  font-size: 12px;
  color: #666;
  text-align: left;           /* ชิดซ้าย */
  width: 80%;                /* กินเต็ม */
}
.footer-left {
  max-width: 400px;
}

.footer-left .logo {
  height: 28px;
  margin-bottom: 10px;
}

.footer-left h4,
.footer-right h4 {
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 8px;
}

.footer-left p,
.footer-right p {
  margin: 0 0 6px;
  font-size: 13px;
  color: #555;
  line-height: 1.5;
}


</style>
