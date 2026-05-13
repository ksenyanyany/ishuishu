from django.contrib import admin
from django.contrib.auth.models import User
from .models import UserProfile, Post, Comment, Message, Notification


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    extra = 0
    fields = ('name', 'handle', 'bio', 'avatar', 'cover')


class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'date_joined', 'is_active', 'is_staff')
    list_filter = ('is_active', 'is_staff')
    search_fields = ('username', 'email')
    actions = ['ban_users']
    inlines = [UserProfileInline]

    def ban_users(self, request, queryset):
        queryset.update(is_active=False)
    ban_users.short_description = 'Заблокировать выбранных пользователей'


class PostAdmin(admin.ModelAdmin):
    list_display = ('id', 'author', 'short_text', 'created_at', 'likes_count')
    list_filter = ('created_at',)
    search_fields = ('text', 'author__username')
    actions = ['delete_selected']

    def short_text(self, obj):
        return obj.text[:80]
    short_text.short_description = 'Текст'

    def likes_count(self, obj):
        return obj.likes.count()
    likes_count.short_description = 'Лайки'


class CommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'author', 'short_text', 'post', 'created_at')
    search_fields = ('text', 'author__username')

    def short_text(self, obj):
        return obj.text[:80]
    short_text.short_description = 'Текст'


class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'sender', 'receiver', 'short_text', 'created_at')
    search_fields = ('text', 'sender__username', 'receiver__username')

    def short_text(self, obj):
        return obj.text[:80]
    short_text.short_description = 'Текст'


admin.site.unregister(User)
admin.site.register(User, UserAdmin)
admin.site.register(Post, PostAdmin)
admin.site.register(Comment, CommentAdmin)
admin.site.register(Message, MessageAdmin)
