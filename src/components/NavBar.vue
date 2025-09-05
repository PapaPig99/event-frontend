<template>
  <nav class="navbar">
    <div class="logo">JoinUp</div>
    <ul class="menu">
      <li><a href="#">Home</a></li>
      <li><a href="#" class="active">Event</a></li>
      <li><a href="#">My Event</a></li>
    </ul>
    <div class="actions">
      <a href="#">Help</a>
      <button class="login-btn">เข้าสู่ระบบ</button>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 50px;
  background: #fff;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}
.logo {
  font-weight: bold;
  color: #ff3d00;
  font-size: 22px;
}
.menu {
  list-style: none;
  display: flex;
  gap: 30px;
}
.menu a {
  text-decoration: none;
  color: #333;
  font-weight: 500;
}
.menu a.active {
  color: #ff3d00;
}
.actions {
  display: flex;
  gap: 15px;
  align-items: center;
}
.login-btn {
  background: #ff3d00;
  border: none;
  padding: 8px 16px;
  color: #fff;
  border-radius: 20px;
  cursor: pointer;
}
</style>
