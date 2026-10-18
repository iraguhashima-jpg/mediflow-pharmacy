<script setup>
import LoginCard from '../components/LoginCard.vue';
</script>
<template>
  <LoginCard
    variant="staff"
    :expectedRole="'STAFF'"
    title="Staff sign-in"
    subtitle="This portal is for counter staff. Only STAFF accounts can sign in here."
    backTo="/" />
</template>
