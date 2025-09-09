
<template>
  <nav class="navbar">
    <div class="logo"><img src="../assets/logo.png"></div>
    <ul class="menu">
      <li><a href="#app">Home</a></li>
      <li><a href="#" class="active">Event</a></li>
      <li><a href="#">My Event</a></li>
    </ul>
    <div class="actions">
      <a href="#"><i class="fa-regular fa-circle-question"></i> Help</a>
      <button class="login-btn">เข้าสู่ระบบ</button>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 32px;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,.08);
  position: sticky;   /* Navbar ติดด้านบน */
  top: 0;
  z-index: 50;
}

.logo img {
  height: 38px;
}

.menu {
  display: flex;
  list-style: none;
  gap: 28px;
  margin: 0;
  padding: 0;
}

.menu a {
  text-decoration: none;
  font-size: 18px;
  font-weight: 500;
  color: #333;
  transition: color .2s;
}

.menu a:hover {
  color: #ff6a13; /* สีหลักของ Event */
}

.menu a.active {
  color: #ff6a13;
  position: relative;
  font-weight: 800;
}

.actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.actions a {
  font-size: 14px;
  color: #555;
  text-decoration: none;
}

.login-btn {
  background: #ff6a13;
  color: #fff;
  border: none;
  padding: 8px 18px;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: background .2s;
}

.login-btn:hover {
  background: #e95a05;
}

</style>
