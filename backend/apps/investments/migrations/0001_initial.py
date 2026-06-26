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
            name='Investment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(max_length=150)),
                ('asset_type', models.CharField(
                    choices=[
                        ('renda_fixa', 'Renda Fixa'),
                        ('acoes', 'Ações'),
                        ('fundos', 'Fundos'),
                        ('cripto', 'Cripto'),
                        ('exterior', 'Exterior'),
                        ('outros', 'Outros'),
                    ],
                    default='outros',
                    max_length=20,
                )),
                ('institution', models.CharField(blank=True, max_length=150)),
                ('invested_amount', models.DecimalField(decimal_places=2, max_digits=14)),
                ('current_amount', models.DecimalField(decimal_places=2, max_digits=14)),
                ('monthly_contribution', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('purchase_date', models.DateField()),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='investments',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'investments',
                'ordering': ['-created_at'],
            },
        ),
    ]
