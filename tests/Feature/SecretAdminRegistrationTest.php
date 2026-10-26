<?php

use App\Models\User;

test('accessing secret admin register page returns ok', function () {
    $response = $this->get('/secret-admin-register');

    $response->assertOk();
});

test('submitting secret admin register creates admin user and redirects to admin dashboard', function () {
    $response = $this->post('/secret-admin-register', [
        'name' => 'Secret Admin',
        'email' => 'secretadmin@admin.com',
        'username' => 'secretadmin',
        'password' => 'admin123',
        'password_confirmation' => 'admin123',
    ]);

    $this->assertAuthenticated();

    $user = User::where('email', 'secretadmin@admin.com')->first();
    expect($user)->not->toBeNull();
    expect($user->role)->toBe('admin');
    expect($user->password_default)->toBeFalse();

    $response->assertRedirect(route('admin.dashboard'));
});
