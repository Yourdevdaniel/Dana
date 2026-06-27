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
            name='CreditCard',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('nickname', models.CharField(max_length=100)),
                ('credit_limit', models.DecimalField(decimal_places=2, max_digits=12)),
                ('current_debt', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('monthly_interest', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('closing_day', models.PositiveSmallIntegerField()),
                ('due_day', models.PositiveSmallIntegerField()),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='credit_cards',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'credit_cards',
                'ordering': ['-created_at'],
            },
        ),
    ]
