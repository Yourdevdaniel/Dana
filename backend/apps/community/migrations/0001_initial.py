import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Friendship',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'Pendente'),
                        ('accepted', 'Aceita'),
                        ('rejected', 'Rejeitada'),
                        ('blocked', 'Bloqueada'),
                    ],
                    default='pending',
                    max_length=10,
                )),
                ('requester', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='sent_friend_requests',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('receiver', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='received_friend_requests',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'friendships',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='friendship',
            constraint=models.UniqueConstraint(
                fields=['requester', 'receiver'],
                name='unique_friendship_pair',
            ),
        ),
        migrations.CreateModel(
            name='CommunityNudge',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('message', models.CharField(max_length=200)),
                ('deliver_at', models.DateTimeField()),
                ('delivered_at', models.DateTimeField(blank=True, null=True)),
                ('status', models.CharField(
                    choices=[
                        ('scheduled', 'Agendado'),
                        ('delivered', 'Entregue'),
                        ('cancelled', 'Cancelado'),
                    ],
                    default='scheduled',
                    max_length=10,
                )),
                ('sender', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='sent_nudges',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('receiver', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='received_nudges',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'community_nudges',
                'ordering': ['-created_at'],
            },
        ),
    ]
