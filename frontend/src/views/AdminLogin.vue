<script setup>
import LoginCard from '../components/LoginCard.vue';
</script>
<template>
  <LoginCard
    variant="admin"
    :expectedRole="'OWNER'"
    title="Owner sign-in"
    subtitle="This portal is for the pharmacy owner. Only OWNER accounts can sign in here."
    backTo="/" />
</template>
